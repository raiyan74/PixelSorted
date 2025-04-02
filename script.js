document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let originalImageUrl = null;
    let originalFileName = null;
    let currentSortType = 'brightness'; // Default sort type
    let currentThreshold = 0.5; // Default threshold
    // Add this with the other global variables at the top of script.js
    let currentSortDirection = 'right'; // Default sort direction
    // Keep this with your other global variables
    let currentChunkWidth = 0; // Default is 0 (no chunking)

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
                    
                    // Draw the image on the canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Hide the upload container
                    const uploadContainer = document.getElementById('uploadContainer');
                    if (uploadContainer) {
                        uploadContainer.style.display = 'none';
                    }
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
            PixelSorter.processImage(canvas, currentSortType, currentThreshold, currentSortDirection, currentChunkWidth);
            // In the sort button event listener
            console.log('Applying sort with chunk width:', currentChunkWidth);
        });
    }
    
});