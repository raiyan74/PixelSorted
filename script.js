document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let originalImageUrl = null;
    let originalFileName = null;

    // Zoom and pan variables
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX, lastMouseY;

    // Get DOM elements
    const fileMenuButton = document.getElementById('fileMenuButton');
    const fileDropdown = document.getElementById('fileDropdown');
    const openImageButton = document.getElementById('openImage');
    const saveImageButton = document.getElementById('saveImage');
    const imageCanvas = document.getElementById('imageView');
    const uploadContainer = document.getElementById('uploadContainer');
    const statusMessage = document.getElementById('statusMessage');

    // Initialize UI
    function initUI() {
        // Set up menu toggle
        if (fileMenuButton && fileDropdown) {
            fileMenuButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                toggleDropdown(fileDropdown);
            });
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            if (fileDropdown && 
                fileDropdown.classList.contains('show-menu') && 
                !fileDropdown.contains(event.target) && 
                event.target !== fileMenuButton) {
                fileDropdown.classList.remove('show-menu');
            }
        });

        // Set up file menu actions
        if (openImageButton) {
            openImageButton.addEventListener('click', handleOpenImage);
        }
        
        if (saveImageButton) {
            saveImageButton.addEventListener('click', handleSaveImage);
        }

        updateStatus('Ready. Open an image to begin.');
    }

    // Toggle dropdown visibility
    function toggleDropdown(dropdown) {
        dropdown.classList.toggle('show-menu');
    }

    // Update status message
    function updateStatus(message) {
        console.log(message);
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    }

    // Get upload button
    const uploadButton = document.getElementById('uploadButton');

    // Add event listener to the upload button
    if (uploadButton) {
        uploadButton.addEventListener('click', handleOpenImage);
    }

    // Handle opening an image
    function handleOpenImage() {
        updateStatus('Selecting image...');
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const selectedFile = this.files[0];
                originalFileName = selectedFile.name;
                
                const imageUrl = URL.createObjectURL(selectedFile);
                loadImageToCanvas(imageUrl).then(() => {
                    originalImageUrl = imageUrl;
                    
                    // Hide upload container
                    if (uploadContainer) {
                        uploadContainer.style.display = 'none';
                    }
                    
                    // Set up zoom and pan
                    setupImageViewport();
                    updateStatus('Image loaded: ' + originalFileName);
                    
                    // Close dropdown
                    if (fileDropdown) {
                        fileDropdown.classList.remove('show-menu');
                    }
                }).catch(error => {
                    updateStatus('Error loading image: ' + error.message);
                });
            }
        });
        
        fileInput.click();
    }

    // Load an image to the canvas
    function loadImageToCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            if (!imageCanvas) {
                reject(new Error('Canvas element not found'));
                return;
            }
            
            const ctx = imageCanvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            
            const img = new Image();
            
            img.onload = function() {
                // Resize canvas to fit the image
                imageCanvas.width = img.width;
                imageCanvas.height = img.height;
                
                // Disable smoothing for pixel-perfect rendering
                disableSmoothing(ctx);
                
                // Draw the image on the canvas
                ctx.drawImage(img, 0, 0);
                
                resolve();
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
            
            img.src = imageUrl;
        });
    }

    // Handle saving the image
    function handleSaveImage() {
        if (!imageCanvas) {
            updateStatus('No image to save');
            return;
        }
        
        updateStatus('Saving image...');
        
        // Create a link element for downloading
        const link = document.createElement('a');
        
        // Generate filename
        let saveFilename = 'image.png';
        
        if (originalFileName) {
            const lastDotIndex = originalFileName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? 
                originalFileName.substring(0, lastDotIndex) : 
                originalFileName;
                
            saveFilename = `${baseName}-edited.png`;
        }
        
        link.download = saveFilename;
        
        // Convert canvas to data URL and trigger download
        link.href = imageCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateStatus('Image saved as ' + saveFilename);
        
        // Close dropdown
        if (fileDropdown) {
            fileDropdown.classList.remove('show-menu');
        }
    }

    // Get the exit button
    const exitButton = document.getElementById('exitApp');

    // Add event listener for exit button
    if (exitButton) {
        exitButton.addEventListener('click', function() {
            // Close the current browser tab/window
            window.close();
            
            // In case window.close() doesn't work (due to browser security restrictions)
            // Add a fallback message
            updateStatus('This browser prevents programmatic closing of tabs. Please close this tab manually.');
            
            // Close dropdown
            if (fileDropdown) {
                fileDropdown.classList.remove('show-menu');
            }
        });
    }

    // Set up image viewport with zoom and pan
    function setupImageViewport() {
        // Reset zoom and pan
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        applyTransform();
        
        // Set up event listeners
        setupZoomAndPan();
    }

    // Set up zoom and pan functionality
    function setupZoomAndPan() {
        if (!imageCanvas) return;
        
        const container = document.querySelector('.main-content');
        
        // Mouse wheel event for zooming
        container.addEventListener('wheel', function(e) {
            e.preventDefault();
            
            // Calculate zoom factor based on wheel delta
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = scale * zoomFactor;
            
            // Limit zoom scale to reasonable values
            if (newScale >= 0.2 && newScale <= 10) {
                // Get mouse position relative to container
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Calculate new offsets to zoom toward cursor
                offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
                offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
                scale = newScale;
                
                // Apply the transformation
                applyTransform();
            }
        });
        
        // Mouse events for dragging/panning
        container.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // Left mouse button only
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                container.style.cursor = 'grabbing';
            }
        });
        
        container.addEventListener('mousemove', function(e) {
            if (isDragging) {
                // Calculate the mouse movement
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;
                
                // Update the offsets
                offsetX += deltaX;
                offsetY += deltaY;
                
                // Save current mouse position for next move event
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                
                // Apply the new transformation
                applyTransform();
            }
        });
        
        // Handle mouseup and mouseleave events
        function endDrag() {
            if (isDragging) {
                isDragging = false;
                container.style.cursor = 'default';
            }
        }
        
        container.addEventListener('mouseup', endDrag);
        container.addEventListener('mouseleave', endDrag);
        
        // Show grabbable cursor when hovering over the image
        imageCanvas.addEventListener('mouseover', function() {
            if (!isDragging) {
                container.style.cursor = 'grab';
            }
        });
        
        imageCanvas.addEventListener('mouseout', function() {
            if (!isDragging) {
                container.style.cursor = 'default';
            }
        });
    }

    // Apply transform to canvas
    function applyTransform() {
        if (imageCanvas) {
            imageCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        }
    }

    // Disable image smoothing on a canvas context
    function disableSmoothing(ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }

    // Initialize the application
    initUI();
});