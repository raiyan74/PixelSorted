/**
 * Enhanced Pixel Sorter Implementation
 * Inspired by C++ implementation with advanced features
 */

// Make the PixelSorter object globally available
window.PixelSorter = {
    /**
     * Main entry point to process an image with sorting
     * @param {HTMLCanvasElement} canvas - The canvas element containing the image
     * @param {Object} config - Configuration options for sorting
     */
    processImage: function(canvas, config = {}) {
        if (!canvas) {
            window.updateStatus('No canvas to process');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            window.updateStatus('Could not get canvas context');
            return;
        }
        
        // Set default values if not provided
        const settings = {
            sortParameter: config.sortParameter || 'brightness',
            lowerThreshold: config.lowerThreshold !== undefined ? config.lowerThreshold : 0.25,
            upperThreshold: config.upperThreshold !== undefined ? config.upperThreshold : 0.75,
            angle: config.angle !== undefined ? config.angle : 0,
            falloffChance: config.falloffChance !== undefined ? config.falloffChance : 100,
            threadCount: config.threadCount !== undefined ? config.threadCount : 4,
            sortType: config.sortType || 'threshold',
            maskCanvas: config.maskCanvas || null,
            maskThreshold: config.maskThreshold !== undefined ? config.maskThreshold : 255
        };
        
        // Log processing details
        console.log(`Processing with: ${settings.sortParameter}, Thresholds: ${settings.lowerThreshold.toFixed(2)}-${settings.upperThreshold.toFixed(2)}, Angle: ${settings.angle}°`);
        window.updateStatus(`Sorting by ${settings.sortParameter} at angle ${settings.angle}°...`);
        
        // Start timing
        const startTime = performance.now();
        
        // Get original image data
        const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process image with rotation if needed
        let processedImageData;
        if (settings.angle !== 0) {
            // Rotate, sort, then rotate back
            const rotatedData = this.rotateImageData(originalImageData, settings.angle);
            const sortedData = this.sortImageData(rotatedData, settings);
            processedImageData = this.rotateImageData(sortedData, -settings.angle);
            
            // Crop to original size if needed
            if (processedImageData.width !== canvas.width || processedImageData.height !== canvas.height) {
                processedImageData = this.cropImageData(
                    processedImageData, 
                    canvas.width, 
                    canvas.height
                );
            }
        } else {
            // Sort directly without rotation
            processedImageData = this.sortImageData(originalImageData, settings);
        }
        
        // Put the processed data back on the canvas
        ctx.putImageData(processedImageData, 0, 0);
        
        // End timing and report
        const endTime = performance.now();
        const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);
        window.updateStatus(`Pixel sorting complete in ${timeElapsed}s`);
    },
    
    /**
     * Sort the image data according to configuration
     */
    sortImageData: function(imageData, settings) {
        const { width, height, data } = imageData;
        
        // Create a copy of the data to work with
        const sortedData = new Uint8ClampedArray(data);
        
        // Calculate rows per thread
        const rowsPerThread = Math.ceil(height / settings.threadCount);
        
        // Simulate multi-threading by processing chunks
        for (let threadIndex = 0; threadIndex < settings.threadCount; threadIndex++) {
            // Calculate this thread's row range
            const startRow = threadIndex * rowsPerThread;
            const endRow = Math.min(startRow + rowsPerThread, height);
            
            // Update status periodically
            if (threadIndex % Math.max(1, Math.floor(settings.threadCount / 10)) === 0) {
                const progress = Math.round((threadIndex / settings.threadCount) * 100);
                window.updateStatus(`Sorting... ${progress}%`);
            }
            
            // Process each row in this thread's range
            for (let y = startRow; y < endRow; y++) {
                this.sortRow(y, width, sortedData, settings);
            }
        }
        
        // Create a new ImageData with the sorted pixels
        return new ImageData(sortedData, width, height);
    },
    
    /**
     * Sort a single row of pixels
     */
    sortRow: function(rowIndex, rowWidth, data, settings) {
        // Find intervals to sort within the thresholds
        let startOfInterval = -1;
        let endOfInterval = -1;
        
        // Process each pixel in the row
        for (let x = 0; x < rowWidth; x++) {
            const pixelIndex = (rowIndex * rowWidth + x) * 4;
            
            // Get pixel RGBA values
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Skip fully transparent pixels
            if (a === 0) continue;
            
            // Calculate value based on sort parameter (normalized 0-1)
            let value;
            switch (settings.sortParameter) {
                case 'brightness':
                    value = (r + g + b) / (3 * 255);
                    break;
                case 'hue':
                    value = this.calculateHue(r, g, b);
                    break;
                case 'saturation':
                    value = this.calculateSaturation(r, g, b);
                    break;
                default:
                    value = (r + g + b) / (3 * 255);
            }
            
            // Check if this pixel is within thresholds
            const withinThreshold = value >= settings.lowerThreshold && value <= settings.upperThreshold;
            
            if (withinThreshold) {
                // Start of a new interval
                if (startOfInterval === -1) {
                    startOfInterval = x;
                    
                    if (settings.sortType === 'threshold') {
                        // Continue to find end of interval for threshold mode
                        continue;
                    } else if (settings.sortType === 'random') {
                        // For random sort, use a random interval length
                        const randLength = Math.floor(Math.random() * 30) + 10;
                        endOfInterval = Math.min(x + randLength, rowWidth - 1);
                        x = endOfInterval; // Skip ahead
                    }
                }
                // Check if at end of row with an open interval
                else if (x === rowWidth - 1) {
                    endOfInterval = x;
                } else {
                    // Within an interval and not at end, continue to find end
                    continue;
                }
            } else {
                // Not within threshold
                if (startOfInterval !== -1) {
                    // End of the current interval
                    endOfInterval = x - 1;
                } else {
                    // Not in an interval, continue
                    continue;
                }
            }
            
            // Apply falloff chance - randomly skip sorting some intervals
            if (Math.random() * 100 > settings.falloffChance) {
                startOfInterval = -1;
                endOfInterval = -1;
                continue;
            }
            
            // If we have a valid interval, sort it
            if (startOfInterval !== -1 && endOfInterval !== -1 && startOfInterval <= endOfInterval) {
                this.sortInterval(startOfInterval, endOfInterval, rowIndex, rowWidth, data, settings.sortParameter);
            }
            
            // Reset interval for next iteration
            startOfInterval = -1;
            endOfInterval = -1;
        }
        
        // Handle case where interval extends to the end of the row
        if (startOfInterval !== -1) {
            endOfInterval = rowWidth - 1;
            
            // Apply falloff chance
            if (Math.random() * 100 <= settings.falloffChance) {
                this.sortInterval(startOfInterval, endOfInterval, rowIndex, rowWidth, data, settings.sortParameter);
            }
        }
    },
    
    /**
     * Sort an interval of pixels
     */
    sortInterval: function(startX, endX, y, width, data, sortParameter) {
        // Extract pixels in the interval
        const pixels = [];
        
        for (let x = startX; x <= endX; x++) {
            const pixelIndex = (y * width + x) * 4;
            
            pixels.push({
                r: data[pixelIndex],
                g: data[pixelIndex + 1],
                b: data[pixelIndex + 2],
                a: data[pixelIndex + 3],
                index: pixelIndex
            });
        }
        
        // Sort pixels based on selected parameter
        pixels.sort((a, b) => {
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
            
            return valueA - valueB;
        });
        
        // Write sorted pixels back to the data array
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const newIndex = (y * width + (startX + i)) * 4;
            
            data[newIndex] = pixel.r;
            data[newIndex + 1] = pixel.g;
            data[newIndex + 2] = pixel.b;
            data[newIndex + 3] = pixel.a;
        }
    },
    
    /**
     * Rotate the image data by a given angle
     */
    rotateImageData: function(imageData, angleDegrees) {
        const { width, height, data } = imageData;
        
        // Create a temporary canvas to perform rotation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions to accommodate rotation
        const radians = angleDegrees * Math.PI / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        
        // Calculate size needed for rotation without cropping
        const newWidth = Math.ceil(height * sin + width * cos);
        const newHeight = Math.ceil(height * cos + width * sin);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Put original image data on temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear and rotate
        ctx.clearRect(0, 0, newWidth, newHeight);
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(radians);
        ctx.translate(-width / 2, -height / 2);
        
        // Draw the rotated image
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Get the rotated image data
        return ctx.getImageData(0, 0, newWidth, newHeight);
    },
    
    /**
     * Crop image data to the specified dimensions
     */
    cropImageData: function(imageData, targetWidth, targetHeight) {
        const { width, height } = imageData;
        
        // Calculate crop position to center the image
        const startX = Math.floor((width - targetWidth) / 2);
        const startY = Math.floor((height - targetHeight) / 2);
        
        // Create temporary canvas for cropping
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
        
        // Create a new canvas with the target dimensions
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = targetWidth;
        croppedCanvas.height = targetHeight;
        
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(
            canvas, 
            startX, startY, targetWidth, targetHeight,
            0, 0, targetWidth, targetHeight
        );
        
        return croppedCtx.getImageData(0, 0, targetWidth, targetHeight);
    },
    
    /**
     * Calculate hue value from RGB values (normalized 0-1)
     */
    calculateHue: function(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max === min) return 0; // Grayscale has no hue
        
        let hue;
        const delta = max - min;
        
        if (max === r) {
            hue = (g - b) / delta + (g < b ? 6 : 0);
        } else if (max === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }
        
        hue /= 6;
        return hue;
    },
    
    /**
     * Calculate saturation value from RGB values (normalized 0-1)
     */
    calculateSaturation: function(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        // For black, saturation is 0
        if (max === 0) return 0;
        
        return (max - min) / max;
    },
    
    /**
     * Create a mask from the current image based on brightness
     */
    createMaskFromImage: function(canvas, threshold = 0.5) {
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Create mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        
        // Create mask data
        const maskData = new Uint8ClampedArray(data.length);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate brightness
            const brightness = (r + g + b) / (3 * 255);
            
            // Set alpha based on brightness threshold
            const alpha = brightness > threshold ? 255 : 0;
            
            // Set mask RGBA
            maskData[i] = 255; // R
            maskData[i + 1] = 255; // G
            maskData[i + 2] = 255; // B
            maskData[i + 3] = alpha; // A
        }
        
        // Put mask data on mask canvas
        maskCtx.putImageData(new ImageData(maskData, canvas.width, canvas.height), 0, 0);
        
        return maskCanvas;
    }
};