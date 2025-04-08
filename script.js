document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let originalImageUrl = null;
    let originalFileName = null;
    let originalImageData = null; // Store original image data for reset
    let isProcessing = false; // Flag to prevent multiple simultaneous operations

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
    const exitButton = document.getElementById('exitApp');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const resetButton = document.getElementById('resetImage');
    const applyButton = document.getElementById('applySort');

    // Global variables and functions for cross-file communication
    window.imageCanvas = imageCanvas;
    window.updateStatus = function(message) {
        console.log(message);
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    };

    // Set PixelSorter as the global processing function
    window.processImage = function(canvas, config) {
        if (isProcessing) {
            window.updateStatus('Processing in progress, please wait...');
            return;
        }
        
        isProcessing = true;
        
        try {
            if (window.PixelSorter && window.PixelSorter.processImage) {
                window.PixelSorter.processImage(canvas, config);
            } else {
                window.updateStatus('Error: Pixel sorter not loaded');
            }
        } catch (error) {
            console.error('Error in image processing:', error);
            window.updateStatus('Error: ' + error.message);
        } finally {
            isProcessing = false;
        }
    };
    
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

        // Add keyboard shortcut for applying pixel sorting (Space)
        document.addEventListener('keydown', function(event) {
            if (event.code === 'Space' && 
                document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA' && 
                document.activeElement.tagName !== 'SELECT') {
                event.preventDefault(); // Prevent scrolling
                if (!isProcessing && window.applyPixelSorting) {
                    window.applyPixelSorting();
                }
            }
        });

        // Add keyboard shortcut for reset (Ctrl+Z)
        document.addEventListener('keydown', function(event) {
            if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && 
                document.activeElement.tagName !== 'INPUT' && 
                document.activeElement.tagName !== 'TEXTAREA' && 
                document.activeElement.tagName !== 'SELECT') {
                event.preventDefault(); // Prevent default undo behavior
                resetImage();
            }
        });

        // Set up file menu actions
        if (openImageButton) {
            openImageButton.addEventListener('click', handleOpenImage);
        }
        
        if (saveImageButton) {
            saveImageButton.addEventListener('click', handleSaveImage);
        }
        
        // Set up exit button
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

        // Add click event to reset button
        if (resetButton) {
            resetButton.addEventListener('click', resetImage);
        }
        
        // Add click event to apply button
        if (applyButton) {
            applyButton.addEventListener('click', function() {
                if (!isProcessing && window.applyPixelSorting) {
                    window.applyPixelSorting();
                }
            });
        }
        
        // Make upload prompt clickable
        if (uploadPrompt) {
            uploadPrompt.addEventListener('click', handleOpenImage);
        }

        // Setup drag and drop
        setupFileDragAndDrop();

        updateStatus('Ready. Open an image to begin.');
    }

    // Set up drag and drop for image loading
    function setupFileDragAndDrop() {
        const dropZone = document.querySelector('.main-content');
        if (!dropZone) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', handleDrop, false);
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        function highlight() {
            dropZone.classList.add('highlight');
        }
        
        function unhighlight() {
            dropZone.classList.remove('highlight');
        }
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        }
    }

    // Handle the dropped or selected file
    function handleFile(file) {
        if (!file || !file.type.match('image.*')) {
            updateStatus('Error: Only image files are supported');
            return;
        }
        
        originalFileName = file.name;
        const imageUrl = URL.createObjectURL(file);
        
        loadImageToCanvas(imageUrl).then(() => {
            originalImageUrl = imageUrl;
            
            // Store original image data for reset
            const ctx = imageCanvas.getContext('2d');
            originalImageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            
            // Hide upload container
            if (uploadContainer) {
                uploadContainer.style.display = 'none';
            }
            
            // Set up zoom and pan
            setupImageViewport();
            updateStatus('Image loaded: ' + originalFileName);
            
            // Close dropdown if open
            if (fileDropdown && fileDropdown.classList.contains('show-menu')) {
                fileDropdown.classList.remove('show-menu');
            }
        }).catch(error => {
            updateStatus('Error loading image: ' + error.message);
        });
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

    // Handle opening an image
    function handleOpenImage() {
        if (isProcessing) {
            window.updateStatus('Processing in progress, please wait...');
            return;
        }
        
        updateStatus('Selecting image...');
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                handleFile(this.files[0]);
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
                // Check if image is too large
                if (img.width > 3000 || img.height > 3000) {
                    const scaleDown = Math.min(3000 / img.width, 3000 / img.height);
                    const newWidth = Math.floor(img.width * scaleDown);
                    const newHeight = Math.floor(img.height * scaleDown);
                    
                    updateStatus(`Resizing large image (${img.width}x${img.height}) to ${newWidth}x${newHeight}`);
                    
                    // Resize the image
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = newWidth;
                    tempCanvas.height = newHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // Resize canvas to fit the image
                    imageCanvas.width = newWidth;
                    imageCanvas.height = newHeight;
                    
                    // Disable smoothing for pixel-perfect rendering
                    disableSmoothing(ctx);
                    
                    // Draw the resized image on the canvas
                    ctx.drawImage(tempCanvas, 0, 0);
                } else {
                    // Resize canvas to fit the image
                    imageCanvas.width = img.width;
                    imageCanvas.height = img.height;
                    
                    // Disable smoothing for pixel-perfect rendering
                    disableSmoothing(ctx);
                    
                    // Draw the image on the canvas
                    ctx.drawImage(img, 0, 0);
                }
                
                // Update the global imageCanvas reference
                window.imageCanvas = imageCanvas;
                
                // Notify other scripts that an image has been loaded
                document.dispatchEvent(new CustomEvent('imageLoaded'));
                
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
        
        if (isProcessing) {
            updateStatus('Processing in progress, please wait...');
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
                
            saveFilename = `${baseName}-sorted.png`;
        }
        
        link.download = saveFilename;
        
        try {
            // Convert canvas to data URL and trigger download
            link.href = imageCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            updateStatus('Image saved as ' + saveFilename);
        } catch (error) {
            console.error('Error saving image:', error);
            updateStatus('Error saving image: ' + error.message);
        }
        
        // Close dropdown
        if (fileDropdown) {
            fileDropdown.classList.remove('show-menu');
        }
    }

    // Function to reset the image
    function resetImage() {
        // Check if there's an original image data
        if (!originalImageData) {
            updateStatus('No image to reset');
            return;
        }
        
        if (isProcessing) {
            updateStatus('Processing in progress, please wait...');
            return;
        }
        
        updateStatus('Resetting image...');
        
        try {
            const ctx = imageCanvas.getContext('2d');
            ctx.putImageData(originalImageData, 0, 0);
            
            // Reset zoom and pan
            scale = 1;
            offsetX = 0;
            offsetY = 0;
            applyTransform();
            
            updateStatus('Image reset successfully');
        } catch (error) {
            console.error('Error resetting image:', error);
            updateStatus('Error resetting image: ' + error.message);
        }
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
        if (!container) return;
        
        // Mouse wheel event for zooming
        container.addEventListener('wheel', function(e) {
            if (isProcessing) return;
            
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
            if (isProcessing) return;
            
            if (e.button === 0) { // Left mouse button only
                // Make sure we're not interacting with a control element
                if (e.target !== imageCanvas && 
                    !e.target.classList.contains('main-content')) {
                    return;
                }
                
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                container.style.cursor = 'grabbing';
                e.preventDefault();
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
            if (!isDragging && !isProcessing) {
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