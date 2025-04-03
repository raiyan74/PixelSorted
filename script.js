document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let originalImageUrl = null;
    let originalFileName = null;
    let currentSortType = 'brightness'; // Default sort type
    let currentThreshold = 0.5; // Default threshold
    // Add this with the other global variables at the top of script.js
    let currentSortDirection = 'right'; // Default sort direction
    

    // Zoom and pan variables
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastMouseX, lastMouseY;

    // UI Elements
    const fileMenuButton = document.querySelector('.menu .menu-button');
    const fileDropdown = document.querySelector('.menu .menu-content');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const sortTypeSelector = document.getElementById('sortTypeSelector');
    const sortButton = document.getElementById('sortButton');
    
    // Initialize UI
    if (thresholdSlider && thresholdValue) {
        thresholdSlider.value = currentThreshold;
        thresholdValue.textContent = currentThreshold.toFixed(2);
        
        // Add event listener for threshold change
        thresholdSlider.addEventListener('input', function() {
            currentThreshold = parseFloat(this.value);
            thresholdValue.textContent = currentThreshold.toFixed(2);
        });
    }
    
    // Initialize sort type selector
    if (sortTypeSelector) {
        sortTypeSelector.value = currentSortType;
        
        // Add event listener for sort type change
        sortTypeSelector.addEventListener('change', function() {
            currentSortType = this.value;
            console.log(`Sort type changed to: ${currentSortType}`);
            
            // Update UI based on selected sort type
            updateUIBasedOnSortType(currentSortType);
        });
    }
    
    // Function to update UI elements based on selected sort type
    function updateUIBasedOnSortType(sortType) {
        const thresholdControl = document.querySelector('.threshold-control');
        
        // Show threshold control for all except random
        if (sortType === 'random') {
            if (thresholdControl) thresholdControl.style.display = 'none';
        } else {
            if (thresholdControl) thresholdControl.style.display = 'block';
        }
    }

    // sortDirectionSelector event listener setup
    const sortDirectionSelector = document.getElementById('sortDirectionSelector');
    if (sortDirectionSelector) {
        sortDirectionSelector.value = currentSortDirection;
        
        // Add event listener for sort direction change
        sortDirectionSelector.addEventListener('change', function() {
            currentSortDirection = this.value;
            console.log(`Sort direction changed to: ${currentSortDirection}`);
        });
    }


    // Initialize UI based on default sort type
    updateUIBasedOnSortType(currentSortType);

    /*

    // Add after your other UI initialization code
    const chunkSlider = document.getElementById('chunkSlider');
    const chunkValue = document.getElementById('chunkValue');
    
    // And update the corresponding event listener:
    if (chunkSlider && chunkValue) {
        chunkSlider.value = currentChunkWidth;
        chunkValue.textContent = currentChunkWidth;
        
        // Add event listener for chunk width change
        chunkSlider.addEventListener('input', function() {
            currentChunkWidth = parseInt(this.value) || 0;
            chunkValue.textContent = currentChunkWidth;
        });
    }
    */

    // Toggle dropdown when clicking on the File button
    if (fileMenuButton && fileDropdown) {
        fileMenuButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Toggle the dropdown
            if (fileDropdown.classList.contains('show-menu')) {
                fileDropdown.classList.remove('show-menu');
            } else {
                fileDropdown.classList.add('show-menu');
            }
        });
    }
    
    // Close the dropdown when clicking anywhere else
    document.addEventListener('click', function(event) {
        if (fileDropdown && fileDropdown.classList.contains('show-menu') && 
            !fileDropdown.contains(event.target) && 
            event.target !== fileMenuButton) {
            fileDropdown.classList.remove('show-menu');
        }
    });
    
    // Menu item click handlers
    const menuItems = fileDropdown ? fileDropdown.querySelectorAll('button') : [];
    menuItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.stopPropagation();
            
            console.log(this.id + ' was clicked');
            
            // Perform action based on which button was clicked
            switch(this.id) {
                case 'openImage':
                    handleOpenImage();
                    break;
                case 'saveImage':
                    handleSaveImage();
                    break;
                case 'restoreImage':
                    handleRestoreImage();
                    break;
            }
            
            // Close the dropdown after action
            if (fileDropdown) {
                fileDropdown.classList.remove('show-menu');
            }
        });
    });

    
    
    // Handle Open Image
    function handleOpenImage() {
        console.log('Open Image action');
    
        // Create an invisible file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*'; // Accept only image files
        
        // Trigger click on the file input
        fileInput.click();
        
        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                const selectedFile = this.files[0];
    
                // Store the original filename
                originalFileName = selectedFile.name;
                
                // Create a URL for the selected file
                const imageUrl = URL.createObjectURL(selectedFile);
                
                // Get the canvas element
                const canvas = document.getElementById('imageView');
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                // Create an image object to load the selected file
                const img = new Image();
                
                img.onload = function() {
                    // Resize canvas to fit the image
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Get the context and disable smoothing
                    const ctx = canvas.getContext('2d');
                    disableSmoothing(ctx);
                    
                    // Draw the image on the canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Hide the upload container
                    const uploadContainer = document.getElementById('uploadContainer');
                    if (uploadContainer) {
                        uploadContainer.style.display = 'none';
                    }
                    
                    // Set up zoom and pan
                    setupImageViewport(canvas);
                };
                
                // Set the image source to the selected file
                img.src = imageUrl;
                
                // Store original image URL for restoration
                originalImageUrl = imageUrl;
                console.log('Image loaded successfully');
            }
        });
    }
    
    
    // Handle Save Image
    function handleSaveImage() {
        console.log('Save Image action');

        // Get the canvas element
        const canvas = document.getElementById('imageView');
        if (!canvas) return;

        // Create a temporary canvas for saving
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Get context and disable smoothing using your function
        const tempCtx = tempCanvas.getContext('2d');
        disableSmoothing(tempCtx);
        
        // Copy the pixel data from original canvas
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        tempCtx.putImageData(imageData, 0, 0);
        
        // Create a temporary link element for download
        const link = document.createElement('a');

        let saveFilename = 'pixelsorted.png'; // Default name

        if (originalFileName) {
            // Extract the base name without extension
            const lastDotIndex = originalFileName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? 
                originalFileName.substring(0, lastDotIndex) : 
                originalFileName;
                
            // Add the suffix and ensure .png extension
            saveFilename = `${baseName}-pixelsorted.png`;
        }
        
        link.download = saveFilename;
        
        // Convert canvas content to data URL
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }



    
    // Handle Restore Image
    function handleRestoreImage() {
        console.log('Restore Original Image action');
        
        if (!originalImageUrl) {
            console.log('No original image to restore');
            return;
        }
        
        const canvas = document.getElementById('imageView');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const img = new Image();
        
        img.onload = function() {
            // Ensure canvas size matches image
            canvas.width = img.width;
            canvas.height = img.height;

            // Get context and disable smoothing
            const ctx = canvas.getContext('2d');
            disableSmoothing(ctx);
            
            // Draw the original image back to the canvas
            ctx.drawImage(img, 0, 0);
        };
        
        img.src = originalImageUrl;
    }
    
    // Set up handlers for the editing tools
    const invertButton = document.getElementById('invertButton');
    if (invertButton) {
        invertButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            PixelSorter.invertImage(canvas);
        });
    }
    
    const randomSortButton = document.getElementById('randomSortButton');
    if (randomSortButton) {
        randomSortButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            PixelSorter.processImage(canvas, 'random', currentThreshold);
        });
    }
    
    const brightSortButton = document.getElementById('brightSortButton');
    if (brightSortButton) {
        brightSortButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            PixelSorter.processImage(canvas, 'brightness', currentThreshold);
        });
    }
    
    const saturationSortButton = document.getElementById('saturationSortButton');
    if (saturationSortButton) {
        saturationSortButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            PixelSorter.processImage(canvas, 'saturation', currentThreshold);
        });
    }
    
    const hueSortButton = document.getElementById('hueSortButton');
    if (hueSortButton) {
        hueSortButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            PixelSorter.processImage(canvas, 'hue', currentThreshold);
        });
    }
    
    // Set up the unified sort button
    
    if (sortButton) {
        sortButton.addEventListener('click', function() {
            const canvas = document.getElementById('imageView');
            // Remove the chunking parameter
            PixelSorter.processImage(canvas, currentSortType, currentThreshold, currentSortDirection);
        });
    }


    //zoom stuff
    function setupZoomAndPan() {
        const canvas = document.getElementById('imageView');
        const container = document.querySelector('.main-content');
        
        if (!canvas) return;
        
        // Mouse wheel event for zooming
        canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            
            // Get mouse position relative to canvas
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom factor based on wheel delta
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
            const newScale = scale * zoomFactor;
            
            // Limit zoom scale to reasonable values
            if (newScale >= 0.1 && newScale <= 10) {
                // Calculate new offsets to zoom toward cursor
                offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
                offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
                scale = newScale;
                
                // Apply the transformation
                applyTransform(canvas);
            }
        });
        
        // Mouse events for dragging/panning
        canvas.addEventListener('mousedown', function(e) {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        canvas.addEventListener('mousemove', function(e) {
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
                applyTransform(canvas);
            }
        });
        
        // Handle mouseup and mouseleave events
        function endDrag() {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'grab';
            }
        }
        
        canvas.addEventListener('mouseup', endDrag);
        canvas.addEventListener('mouseleave', endDrag);
        
        // Set initial cursor style
        canvas.style.cursor = 'grab';
        
        // Add reset button to tools panel
        const toolsPanel = document.querySelector('.tools-panel');
        if (toolsPanel) {
            const resetButton = document.createElement('button');
            resetButton.textContent = 'Reset Zoom';
            resetButton.className = 'tool-button';
            resetButton.addEventListener('click', function() {
                scale = 1;
                offsetX = 0;
                offsetY = 0;
                applyTransform(canvas);
            });
            
            toolsPanel.appendChild(resetButton);
        }
    }

    // After successfully loading an image, call:
    function setupImageViewport(canvas) {
        // Reset zoom and pan
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        applyTransform(canvas);
        
        // Setup zoom and pan events
        setupZoomAndPan();
    }
    
    // Apply transform to the canvas
    function applyTransform(canvas) {
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        canvas.style.transformOrigin = '0 0';
    }

    // Add this function to script.js
    function disableSmoothing(ctx) {
        // Disable image smoothing for crisp pixels
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }
    
});