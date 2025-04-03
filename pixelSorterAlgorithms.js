/**
 * Pixel Sorter Algorithms
 * This file contains my implementation of different pixel sorting algorithms
 * Added chunking and mirroring functionality for more interesting visual effects
 */

// My namespace for pixel sorting algorithms
const PixelSorter = {
    
    /**
     * Main entry point to process an image with sorting
     */

    // Modified processImage function without chunking
    processImage: function(canvas, sortType, threshold, direction = 'right') {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Add some debug logging
    console.log(`Processing image with direction: ${direction}`);
    
    // Disable smoothing at the beginning
    this.disableSmoothing(ctx);
    
    // Get image data from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Route to the appropriate sorting algorithm based on direction
    const sortedData = this.sortPixelsByDirection(imageData, sortType, threshold, direction);
    
    // Put the sorted data back on the canvas
    ctx.putImageData(sortedData, 0, 0);

    // Disable smoothing again after putting image data
    this.disableSmoothing(ctx);

    },

    // Modified router function without chunking parameter
    
    sortPixelsByDirection: function(imageData, sortType, threshold, direction) {
        // Log parameters to help with debugging
        console.log(`Direction: ${direction}, SortType: ${sortType}, Threshold: ${threshold}`);
        
        // Convert the direction string to a boolean 'reverse' parameter
        let reverse = false;
        let isVertical = false;
        
        if (direction === 'left' || direction === 'up') {
            reverse = true;
        }
        
        if (direction === 'up' || direction === 'down') {
            isVertical = true;
        }
        
        // Call processPixels directly instead of going through wrapper functions
        return this.processPixels(imageData, sortType, threshold, reverse, isVertical);
    },

/*
    //processImage with chunk
    processImage: function(canvas, sortType, threshold, direction = 'right', chunkSetting = 0) {
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Disable smoothing at the beginning
        this.disableSmoothing(ctx);
        
        // Get image data from canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Route to the appropriate sorting algorithm based on direction
        const sortedData = this.sortPixelsByDirection(imageData, sortType, threshold, direction, chunkSetting);
        
        // Put the sorted data back on the canvas
        ctx.putImageData(sortedData, 0, 0);

        // Disable smoothing again after putting image data
        this.disableSmoothing(ctx);
    },
    
    // Router to direct to either horizontal or vertical sorting
    sortPixelsByDirection: function(imageData, sortType, threshold, direction, chunkSetting) {
        switch (direction) {
            case 'right':
                return this.sortPixelsHorizontal(imageData, sortType, threshold, false, chunkSetting);
            case 'left':
                return this.sortPixelsHorizontal(imageData, sortType, threshold, true, chunkSetting);
            case 'down':
                return this.sortPixelsVertical(imageData, sortType, threshold, false, chunkSetting);
            case 'up':
                return this.sortPixelsVertical(imageData, sortType, threshold, true, chunkSetting);
            default:
                return this.sortPixelsHorizontal(imageData, sortType, threshold, false, chunkSetting);
        }
    },
*/


    // Generic function to process pixels one row/column at a time with optional chunking
    
    // Simplified processPixels function without chunking
    processPixels: function(imageData, sortType, threshold, reverse, isVertical) {
        const { width, height, data } = imageData;
        
        // Determine if we're processing horizontal rows or vertical columns
        const primaryDimension = isVertical ? width : height;
        const secondaryDimension = isVertical ? height : width;
        
        // Process each line of pixels (full width or height)
        for (let primary = 0; primary < primaryDimension; primary++) {
            this.processSingleLine(primary, secondaryDimension, data, width, height, sortType, threshold, reverse, isVertical);
        }
        
        return imageData;
    },


    // Fixed wrapper functions
    sortPixelsHorizontal: function(imageData, sortType, threshold, reverse) {
        return this.processPixels(imageData, sortType, threshold, reverse, false);
    },

    sortPixelsVertical: function(imageData, sortType, threshold, reverse) {
        return this.processPixels(imageData, sortType, threshold, reverse, true);
    },



    /*
    //processPixels with chunks
    processPixels: function(imageData, sortType, threshold, reverse, chunkSetting, isVertical) {
        const { width, height, data } = imageData;
        
        // Determine if we're processing horizontal rows or vertical columns
        const primaryDimension = isVertical ? width : height;
        const secondaryDimension = isVertical ? height : width;
        
        // Skip chunking if chunkSetting is 0
        if (chunkSetting === 0) {
            // Process each line of pixels (full width or height)
            for (let primary = 0; primary < primaryDimension; primary++) {
                this.processSingleLine(primary, secondaryDimension, data, width, height, sortType, threshold, reverse, isVertical);
            }
        } else {
            // Calculate chunk size based on slider value (1-100)
            const minChunkSize = 1;
            const maxChunkSize = Math.max(5, Math.floor(primaryDimension / 10));
            const factor = 1 - (chunkSetting / 100); // Higher values = smaller chunks
            const effectiveChunkSize = Math.max(minChunkSize, Math.round(maxChunkSize * factor));
            
            // Process image in chunks
            let shouldFlipChunk = false; // Toggle for alternating chunk flips
            
            for (let chunkStart = 0; chunkStart < primaryDimension; chunkStart += effectiveChunkSize) {
                // Calculate the end of this chunk
                const chunkEnd = Math.min(chunkStart + effectiveChunkSize, primaryDimension);
                
                if (isVertical) {
                    // Processing columns (vertical sorting)
                    // For vertical sorting, process each column normally and we'll handle flipping later
                    for (let primary = chunkStart; primary < chunkEnd; primary++) {
                        // Process each column normally
                        this.processSingleLine(primary, secondaryDimension, data, width, height, sortType, threshold, reverse, isVertical);
                    }
                    
                    // If this chunk should be flipped, flip the columns horizontally
                    if (shouldFlipChunk) {
                        // Create a temporary buffer for this chunk's data
                        const chunkData = new Uint8ClampedArray((chunkEnd - chunkStart) * secondaryDimension * 4);
                        
                        // Copy the chunk data into the buffer
                        for (let y = 0; y < secondaryDimension; y++) {
                            for (let x = 0; x < (chunkEnd - chunkStart); x++) {
                                const srcIndex = (y * width + (chunkStart + x)) * 4;
                                const destIndex = (y * (chunkEnd - chunkStart) + x) * 4;
                                
                                chunkData[destIndex] = data[srcIndex];
                                chunkData[destIndex + 1] = data[srcIndex + 1];
                                chunkData[destIndex + 2] = data[srcIndex + 2];
                                chunkData[destIndex + 3] = data[srcIndex + 3];
                            }
                        }
                        
                        // Write the chunk data back in flipped order (horizontally)
                        for (let y = 0; y < secondaryDimension; y++) {
                            for (let x = 0; x < (chunkEnd - chunkStart); x++) {
                                const destIndex = (y * width + (chunkStart + x)) * 4;
                                const srcIndex = (y * (chunkEnd - chunkStart) + ((chunkEnd - chunkStart) - 1 - x)) * 4;
                                
                                data[destIndex] = chunkData[srcIndex];
                                data[destIndex + 1] = chunkData[srcIndex + 1];
                                data[destIndex + 2] = chunkData[srcIndex + 2];
                                data[destIndex + 3] = chunkData[srcIndex + 3];
                            }
                        }
                    }
                } else {
                    // Processing rows (horizontal sorting)
                    if (shouldFlipChunk) {
                        // For horizontal sorting with flipping, process rows in reverse order
                        for (let primary = chunkEnd - 1; primary >= chunkStart; primary--) {
                            this.processSingleLine(primary, secondaryDimension, data, width, height, sortType, threshold, reverse, isVertical);
                        }
                    } else {
                        // Process rows in normal order
                        for (let primary = chunkStart; primary < chunkEnd; primary++) {
                            this.processSingleLine(primary, secondaryDimension, data, width, height, sortType, threshold, reverse, isVertical);
                        }
                    }
                }
                
                // Toggle the flip state for the next chunk
                shouldFlipChunk = !shouldFlipChunk;
            }
        }
        
        return imageData;
    },
   
    */
    // Process a single line (row or column) of pixels
    
    processSingleLine: function(primary, length, data, width, height, sortType, threshold, reverse, isVertical) {
        // Extract pixels from this line
        const line = [];
        
        for (let secondary = 0; secondary < length; secondary++) {
            // Calculate pixel index based on whether we're processing vertically or horizontally
            const x = isVertical ? primary : secondary;
            const y = isVertical ? secondary : primary;
            const index = (y * width + x) * 4;
            
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            line.push({ r, g, b, a });
        }
        
        // Apply the selected sorting algorithm
        let sortedLine;
        switch (sortType) {
            case 'brightness':
                sortedLine = this.brightnessSort(line, threshold, reverse);
                break;
            case 'saturation':
                sortedLine = this.saturationSort(line, threshold, reverse);
                break;
            case 'hue':
                sortedLine = this.hueSort(line, threshold, reverse);
                break;
            case 'random':
                sortedLine = this.randomSort(line, reverse);
                break;
            default:
                sortedLine = this.brightnessSort(line, threshold, reverse);
        }
        
        // Write pixels back to the image data
        for (let secondary = 0; secondary < sortedLine.length; secondary++) {
            const pixel = sortedLine[secondary];
            
            // Calculate index based on whether we're processing vertically or horizontally
            const x = isVertical ? primary : secondary;
            const y = isVertical ? secondary : primary;
            const index = (y * width + x) * 4;
            
            data[index] = pixel.r;
            data[index + 1] = pixel.g;
            data[index + 2] = pixel.b;
            data[index + 3] = pixel.a;
        }
    },
    
    /**
     * My implementation of brightness-based pixel sorting
     */
    brightnessSort: function(pixels, threshold, reverse) {
        const aboveThreshold = [];
        const belowThreshold = [];
        
        // Divide pixels based on brightness threshold
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const brightness = (pixel.r + pixel.g + pixel.b) / (3 * 255); // Normalize to 0-1
            
            if (brightness >= threshold) {
                aboveThreshold.push(pixel);
            } else {
                belowThreshold.push(pixel);
            }
        }
        
        // Sort pixels above threshold by brightness
        aboveThreshold.sort((a, b) => {
            const brightnessA = (a.r + a.g + a.b) / 3;
            const brightnessB = (b.r + b.g + b.b) / 3;
            // Use reverse parameter to determine sort direction
            return reverse ? brightnessB - brightnessA : brightnessA - brightnessB;
        });
        
        // Combine sorted and unsorted pixels
        return [...aboveThreshold, ...belowThreshold];
    },
    
    /**
     * My implementation of saturation-based pixel sorting
     */
    saturationSort: function(pixels, threshold, reverse) {
        const aboveThreshold = [];
        const belowThreshold = [];
        
        // Divide pixels based on saturation threshold
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const saturation = this.calculateSaturation(pixel.r, pixel.g, pixel.b);
            
            if (saturation >= threshold) {
                aboveThreshold.push(pixel);
            } else {
                belowThreshold.push(pixel);
            }
        }
        
        // Sort pixels above threshold by saturation
        aboveThreshold.sort((a, b) => {
            const satA = this.calculateSaturation(a.r, a.g, a.b);
            const satB = this.calculateSaturation(b.r, b.g, b.b);
            // Use reverse parameter to determine sort direction
            return reverse ? satB - satA : satA - satB;
        });
        
        // Combine sorted and unsorted pixels
        return [...aboveThreshold, ...belowThreshold];
    },
    
    /**
     * My implementation of hue-based pixel sorting
     */
    hueSort: function(pixels, threshold, reverse) {
        const aboveThreshold = [];
        const belowThreshold = [];
        
        // Divide pixels based on hue threshold
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const hue = this.calculateHue(pixel.r, pixel.g, pixel.b);
            
            if (hue >= threshold) {
                aboveThreshold.push(pixel);
            } else {
                belowThreshold.push(pixel);
            }
        }
        
        // Sort pixels above threshold by hue
        aboveThreshold.sort((a, b) => {
            const hueA = this.calculateHue(a.r, a.g, a.b);
            const hueB = this.calculateHue(b.r, b.g, b.b);
            // Use reverse parameter to determine sort direction
            return reverse ? hueB - hueA : hueA - hueB;
        });
        
        // Combine sorted and unsorted pixels
        return [...aboveThreshold, ...belowThreshold];
    },
    
    /**
     * My implementation of random-segmented pixel sorting
     * This divides the line into random chunks and sorts each chunk separately
     */
    randomSort: function(pixels, reverse) {
        // Generate a random division factor
        const divideUpList = Math.floor(Math.random() * 44 + 17);
        
        // Calculate how many pixels per division
        const dividedPixelCount = Math.floor(pixels.length / divideUpList);
        if (dividedPixelCount < 1) return pixels; // Return original if divisions are too small
        
        // Handle leftover pixels
        const leftOverPixels = pixels.length % dividedPixelCount;
        
        const result = [];
        
        // Process pixels in chunks
        for (let i = 0; i < pixels.length;) {
            // Handle the last remaining pixels that don't form a complete chunk
            if (leftOverPixels !== 0 && i === (pixels.length - leftOverPixels)) {
                // Add remaining pixels directly
                for (let p = i; p < pixels.length; p++) {
                    result.push(pixels[p]);
                }
                i += dividedPixelCount;
            } else {
                // Define the current chunk's boundaries
                const partitionEnd = Math.min(i + dividedPixelCount, pixels.length);
                
                // Extract the chunk
                const subPixelList = pixels.slice(i, partitionEnd);
                
                // Sort this chunk by brightness
                subPixelList.sort((a, b) => {
                    const brightnessA = (a.r + a.g + a.b) / 3;
                    const brightnessB = (b.r + b.g + b.b) / 3;
                    // Use reverse parameter to determine sort direction
                    return reverse ? brightnessB - brightnessA : brightnessA - brightnessB;
                });
                
                // Add sorted chunk to result
                result.push(...subPixelList);
                
                // Move to next chunk
                i = partitionEnd;
            }
        }
        
        return result;
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
     * Simple color inversion effect
     */
    invertImage: function(canvas) {
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Invert each pixel color
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];         // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
            // Alpha channel (i + 3) remains unchanged
        }
        
        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);
    },

    disableSmoothing: function(ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
    }

};