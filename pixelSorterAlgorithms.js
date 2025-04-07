/**
 * Enhanced Pixel Sorter Algorithms
 * Inspired by C++ implementation with advanced features
 */

const PixelSorter = {
    /**
     * Main entry point to process an image with sorting
     * @param {HTMLCanvasElement} canvas - The canvas element containing the image
     * @param {string} sortParameter - The parameter to sort by: 'brightness', 'hue', 'saturation'
     * @param {number} lowerThreshold - Lower threshold value (0-1)
     * @param {number} upperThreshold - Upper threshold value (0-1)
     * @param {string} direction - Sort direction: 'right', 'left', 'down', 'up'
     * @param {number} angle - Rotation angle in degrees
     * @param {number} falloffChance - Chance to skip sorting (0-100)
     * @param {number} threadCount - Number of threads to simulate
     * @param {string} sortType - Type of sorting: 'threshold' or 'random'
     * @param {HTMLCanvasElement} maskCanvas - Optional mask canvas
     * @param {number} maskThreshold - Threshold for mask (0-255)
     */
    processImage: function(canvas, {
        sortParameter = 'brightness',
        lowerThreshold = 0.25,
        upperThreshold = 0.8, 
        angle = 0,
        falloffChance = 100,
        threadCount = 4,
        sortType = 'threshold',
        maskCanvas = null,
        maskThreshold = 255
    } = {}) {
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        console.log(`Processing image: ${sortParameter}, thresholds: ${lowerThreshold}-${upperThreshold}, angle: ${angle}°`);
        
        // Disable image smoothing for crisp pixels
        this.disableSmoothing(ctx);
        
        // Get original image data
        const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Get mask data if provided
        let maskData = null;
        let useMask = false;
        if (maskCanvas) {
            const maskCtx = maskCanvas.getContext('2d');
            maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
            useMask = true;
        }
        
        // If rotation is needed, create a rotated copy of the image
        let imageData = originalImageData;
        let paddingAddedToImage = false;
        let xPadding = 0;
        let yPadding = 0;
        
        if (angle !== 0) {
            const result = this.rotateImage(originalImageData, angle);
            imageData = result.imageData;
            paddingAddedToImage = true;
            xPadding = result.xPadding;
            yPadding = result.yPadding;
        }
        
        // Process the image using simulated multi-threading
        const sortedData = this.processImageWithThreads(
            imageData, 
            sortParameter, 
            lowerThreshold, 
            upperThreshold, 
            threadCount, 
            falloffChance, 
            sortType,
            useMask,
            maskData,
            maskThreshold,
            angle,
            paddingAddedToImage,
            xPadding,
            yPadding
        );
        
        // If we rotated the image, rotate it back
        let finalImageData = sortedData;
        if (angle !== 0) {
            // Rotate back to original orientation
            const result = this.rotateImage(sortedData, -angle);
            // Crop to original size
            finalImageData = this.cropToOriginalSize(
                result.imageData, 
                originalImageData.width, 
                originalImageData.height
            );
        }
        
        // Put the sorted data back on the canvas
        ctx.putImageData(finalImageData, 0, 0);
        
        // Ensure smoothing is still disabled
        this.disableSmoothing(ctx);
    },
    
    /**
     * Simulates multi-threading by dividing the image into chunks and processing each row
     */
    processImageWithThreads: function(
        imageData, 
        sortParameter, 
        lowerThreshold, 
        upperThreshold, 
        threadCount, 
        falloffChance,
        sortType,
        useMask,
        maskData,
        maskThreshold,
        angle,
        paddingAddedToImage,
        xPadding,
        yPadding
    ) {
        const { width, height, data } = imageData;
        
        // Create a copy of the image data to work with
        const resultData = new Uint8ClampedArray(data);
        
        // Process in chunks to simulate threading
        const rowsPerThread = Math.ceil(height / threadCount);
        
        // Process each "thread" chunk
        for (let threadIndex = 0; threadIndex < threadCount; threadIndex++) {
            const startRow = threadIndex * rowsPerThread;
            const endRow = Math.min(startRow + rowsPerThread, height);
            
            // Process each row in this thread's chunk
            for (let y = startRow; y < endRow; y++) {
                this.processRow(
                    y,
                    width,
                    resultData,
                    width,
                    height,
                    sortParameter,
                    lowerThreshold,
                    upperThreshold,
                    falloffChance,
                    sortType,
                    useMask,
                    maskData,
                    maskThreshold,
                    angle,
                    paddingAddedToImage,
                    xPadding,
                    yPadding
                );
            }
        }
        
        // Create a new ImageData object with the processed data
        return new ImageData(resultData, width, height);
    },
    
    /**
     * Process a single row of pixels
     */
    processRow: function(
        rowIndex,
        rowLength,
        data,
        imageWidth,
        imageHeight,
        sortParameter,
        lowerThreshold,
        upperThreshold,
        falloffChance,
        sortType,
        useMask,
        maskData,
        maskThreshold,
        angle,
        paddingAddedToImage,
        xPadding,
        yPadding
    ) {
        // For processing intervals within the row
        let startOfInterval = -1;
        let endOfInterval = -1;
        
        // Process each pixel in the row
        for (let x = 0; x < rowLength; x++) {
            // Calculate pixel index
            const pixelIndex = (rowIndex * imageWidth + x) * 4;
            
            // Get pixel color
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Skip fully transparent pixels
            if (a === 0) continue;
            
            // Calculate value based on sort parameter
            let value = 0;
            switch (sortParameter) {
                case 'brightness':
                    value = (r + g + b) / (3 * 255); // Normalize to 0-1
                    break;
                case 'hue':
                    value = this.calculateHue(r, g, b);
                    break;
                case 'saturation':
                    value = this.calculateSaturation(r, g, b);
                    break;
            }
            
            // Check mask if using one
            let maskApproved = !useMask;
            if (useMask && maskData) {
                // Calculate unrotated coordinates to check mask
                let unrotatedX = x;
                let unrotatedY = rowIndex;
                
                if (paddingAddedToImage && angle !== 0) {
                    // Convert current coordinates to unrotated coordinates using rotation matrix
                    const centerX = imageWidth / 2;
                    const centerY = imageHeight / 2;
                    
                    // Translate to origin
                    const translatedX = x - centerX;
                    const translatedY = rowIndex - centerY;
                    
                    // Rotate by -angle
                    const radians = angle * (Math.PI / 180);
                    const rotateSine = Math.sin(radians);
                    const rotateCosine = Math.cos(radians);
                    
                    const rotatedX = translatedX * rotateCosine - translatedY * rotateSine;
                    const rotatedY = translatedX * rotateSine + translatedY * rotateCosine;
                    
                    // Translate back
                    unrotatedX = rotatedX + centerX - xPadding;
                    unrotatedY = rotatedY + centerY - yPadding;
                }
                
                // Check if within mask bounds
                if (
                    unrotatedX >= 0 && 
                    unrotatedX < maskData.width && 
                    unrotatedY >= 0 && 
                    unrotatedY < maskData.height
                ) {
                    const maskIndex = (unrotatedY * maskData.width + unrotatedX) * 4;
                    maskApproved = maskData[maskIndex + 3] >= maskThreshold;
                }
            }
            
            // Check if this pixel is within the thresholds and mask-approved
            const withinThreshold = value >= lowerThreshold && value <= upperThreshold;
            
            if (maskApproved && withinThreshold) {
                // This pixel meets criteria for sorting
                if (startOfInterval === -1) {
                    // Start of a new interval
                    startOfInterval = x;
                    
                    if (sortType === 'threshold') {
                        // Continue to find end of interval
                        continue;
                    } else if (sortType === 'random') {
                        // For random sort type, calculate a random length interval
                        const rando = Math.floor(Math.random() * 100) + 1;
                        endOfInterval = Math.min(x + Math.floor(rowLength * 0.01) + rando, rowLength - 1);
                        x = endOfInterval + 1;
                    }
                } else if (x < rowLength - 1) {
                    // Within an interval, but not at the end of the row
                    if (sortType === 'threshold') {
                        continue;
                    }
                }
                // Otherwise, we're at the end of the row with an open interval
            } else {
                // This pixel doesn't meet criteria for sorting
                if (startOfInterval === -1) {
                    // Not currently in an interval, nothing to do
                    continue;
                }
                // Otherwise, we've reached the end of the current interval
            }
            
            // If we've come this far, we have an interval to sort
            if (sortType === 'threshold') {
                endOfInterval = x - 1;
            }
            
            // Apply falloff chance - randomly skip some intervals
            if (Math.random() * 100 > falloffChance) {
                startOfInterval = -1;
                endOfInterval = -1;
                continue;
            }
            
            // Ensure valid interval
            if (startOfInterval !== -1 && endOfInterval !== -1 && endOfInterval >= startOfInterval) {
                this.sortInterval(
                    startOfInterval,
                    endOfInterval,
                    rowIndex,
                    data,
                    imageWidth,
                    sortParameter
                );
            }
            
            // Reset interval
            startOfInterval = -1;
            endOfInterval = -1;
        }
        
        // Handle case where interval extends to the end of the row
        if (startOfInterval !== -1) {
            endOfInterval = rowLength - 1;
            
            // Apply falloff chance
            if (Math.random() * 100 <= falloffChance) {
                this.sortInterval(
                    startOfInterval,
                    endOfInterval,
                    rowIndex,
                    data,
                    imageWidth,
                    sortParameter
                );
            }
        }
    },
    
    /**
     * Sort pixels in an interval according to the selected parameter
     */
    sortInterval: function(
        startIdx,
        endIdx,
        rowIndex,
        data,
        imageWidth,
        sortParameter
    ) {
        // Extract the interval of pixels
        const intervalPixels = [];
        
        for (let x = startIdx; x <= endIdx; x++) {
            const pixelIndex = (rowIndex * imageWidth + x) * 4;
            
            intervalPixels.push({
                r: data[pixelIndex],
                g: data[pixelIndex + 1],
                b: data[pixelIndex + 2],
                a: data[pixelIndex + 3],
                originalIndex: x
            });
        }
        
        // Sort the pixels based on the selected parameter
        intervalPixels.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortParameter) {
                case 'brightness':
                    valueA = (a.r + a.g + a.b) / 3;
                    valueB = (b.r + b.g + b.b) / 3;
                    break;
                case 'hue':
                    valueA = this.calculateHue(a.r, a.g, a.b);
                    valueB = this.calculateHue(b.r, b.g, b.b);
                    break;
                case 'saturation':
                    valueA = this.calculateSaturation(a.r, a.g, a.b);
                    valueB = this.calculateSaturation(b.r, b.g, b.b);
                    break;
                default:
                    valueA = (a.r + a.g + a.b) / 3;
                    valueB = (b.r + b.g + b.b) / 3;
            }
            
            // Always sort ascending
            return valueA - valueB;
        });
        
        // Write sorted pixels back to the data array
        for (let i = 0; i < intervalPixels.length; i++) {
            const pixelToPlace = intervalPixels[i];
            const targetPosition = startIdx + i;
            
            const pixelIndex = (rowIndex * imageWidth + targetPosition) * 4;
            
            data[pixelIndex] = pixelToPlace.r;
            data[pixelIndex + 1] = pixelToPlace.g;
            data[pixelIndex + 2] = pixelToPlace.b;
            data[pixelIndex + 3] = pixelToPlace.a;
        }
    },
    
    /**
     * Rotates an image by the specified angle, adding padding to accommodate rotation
     */
    rotateImage: function(imageData, angle) {
        const { width, height, data } = imageData;
        
        // Create a canvas for rotation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate the size needed for rotated image
        const radians = angle * (Math.PI / 180);
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        
        const diagonal = Math.ceil(Math.sqrt(width * width + height * height));
        const newWidth = diagonal;
        const newHeight = diagonal;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Calculate padding
        const xPadding = (newWidth - width) / 2;
        const yPadding = (newHeight - height) / 2;
        
        // Clear the canvas
        ctx.clearRect(0, 0, newWidth, newHeight);
        
        // Put the original image data on canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Translate and rotate
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(radians);
        ctx.translate(-width / 2, -height / 2);
        
        // Draw the image
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Get the rotated image data
        const rotatedImageData = ctx.getImageData(0, 0, newWidth, newHeight);
        
        return { 
            imageData: rotatedImageData, 
            xPadding, 
            yPadding 
        };
    },
    
    /**
     * Crops rotated image back to original size
     */
    cropToOriginalSize: function(imageData, originalWidth, originalHeight) {
        const { width, height, data } = imageData;
        
        // Create temporary canvas for cropping
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        // Calculate cropping coordinates
        const xOffset = Math.floor((width - originalWidth) / 2);
        const yOffset = Math.floor((height - originalHeight) / 2);
        
        // Crop the image
        const croppedImageData = ctx.getImageData(
            xOffset, 
            yOffset, 
            originalWidth, 
            originalHeight
        );
        
        return croppedImageData;
    },
    
    /**
     * Helper function to calculate saturation from RGB values
     */
    calculateSaturation: function(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return max === 0 ? 0 : (max - min) / max;
    },
    
    /**
     * Helper function to calculate hue from RGB values
     */
    calculateHue: function(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max === min) {
            return 0; // No hue for grayscale
        }
        
        const d = max - min;
        let h;
        
        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else {
            h = (r - g) / d + 4;
        }
        
        return h / 6; // Normalize to 0-1
    },
    
    /**
     * Creates a mask canvas from the current image based on brightness
     */
    createMaskFromImage: function(canvas, threshold = 0.5) {
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        // Create a mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        
        const maskCtx = maskCanvas.getContext('2d');
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Create mask data
        const maskData = new Uint8ClampedArray(data.length);
        
        // Convert image to mask based on brightness
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate brightness
            const brightness = (r + g + b) / (3 * 255);
            
            // Set alpha based on brightness threshold
            const alpha = brightness > threshold ? 255 : 0;
            
            // Set mask pixel - white with variable alpha
            maskData[i] = 255;     // R
            maskData[i + 1] = 255; // G
            maskData[i + 2] = 255; // B
            maskData[i + 3] = alpha; // A
        }
        
        // Put mask data on mask canvas
        maskCtx.putImageData(new ImageData(maskData, canvas.width, canvas.height), 0, 0);
        
        return maskCanvas;
    },
    
    /**
     * Inverts a mask
     */
    invertMask: function(maskCanvas) {
        if (!maskCanvas) return;
        
        const ctx = maskCanvas.getContext('2d');
        if (!ctx) return;
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const data = imageData.data;
        
        // Invert alpha channel
        for (let i = 0; i < data.length; i += 4) {
            data[i + 3] = 255 - data[i + 3]; // Invert alpha
        }
        
        // Put modified data back
        ctx.putImageData(imageData, 0, 0);
    },
    
    /**
     * Disables image smoothing on a canvas context
     */
    disableSmoothing: function(ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }
};