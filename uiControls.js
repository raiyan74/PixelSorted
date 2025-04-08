/**
 * Enhanced UI Controls for Pixel Sorter
 * Provides UI for visualizing and controlling sort thresholds and rotation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Sorting configuration (made global for other scripts)
    window.sortConfig = {
        sortParameter: 'brightness',
        lowerThreshold: 0.25,
        upperThreshold: 0.75,
        angle: 0,
        falloffChance: 100,
        threadCount: 4,
        sortType: 'threshold'
    };

    // UI state variables
    let histogramData = [];
    let isDraggingLower = false;
    let isDraggingUpper = false;
    let isDraggingRotation = false;

    // Get UI elements
    const sortTypeSelector = document.getElementById('sortTypeSelector');
    const histogramCanvas = document.getElementById('histogramCanvas');
    const lowerThresholdHandle = document.getElementById('lowerThresholdHandle');
    const upperThresholdHandle = document.getElementById('upperThresholdHandle');
    const lowerThresholdValue = document.getElementById('lowerThresholdValue');
    const upperThresholdValue = document.getElementById('upperThresholdValue');
    const applyButton = document.getElementById('applySort');
    const resetButton = document.getElementById('resetImage');

    // Rotation direction elements
    const rotationContainer = document.getElementById('rotationDirectionContainer');
    const rotationCanvas = document.getElementById('rotationDirectionCanvas');
    const rotationHandle = document.getElementById('rotationDirectionHandle');
    const rotationValueDisplay = document.getElementById('rotationDirectionValue');

    // Global apply function for keyboard shortcut
    window.applyPixelSorting = function() {
        if (!window.imageCanvas) {
            window.updateStatus('No image to process');
            return;
        }
        
        window.updateStatus('Applying pixel sorting...');
        
        // Call the sorting function
        if (window.processImage) {
            // Create a complete config object with all parameters
            const fullConfig = {
                sortParameter: window.sortConfig.sortParameter,
                lowerThreshold: window.sortConfig.lowerThreshold,
                upperThreshold: window.sortConfig.upperThreshold,
                angle: window.sortConfig.angle,
                falloffChance: window.sortConfig.falloffChance,
                threadCount: window.sortConfig.threadCount,
                sortType: window.sortConfig.sortType
            };
            
            window.processImage(window.imageCanvas, fullConfig);
        } else {
            window.updateStatus('Pixel sorting module not loaded');
        }
    };

    // Initialize controls
    function initControls() {
        // Sort type selector
        if (sortTypeSelector) {
            // Map value to the correct parameter name
            sortTypeSelector.addEventListener('change', function() {
                window.sortConfig.sortParameter = this.value;
                generateHistogram(); // Regenerate histogram when sort type changes
            });
        }
        
        // Apply button
        if (applyButton) {
            applyButton.addEventListener('click', window.applyPixelSorting);
        }
        
        // Set up histogram and threshold controls
        setupHistogram();
        
        // Set up rotation direction control
        setupRotationControl();
        
        // Listen for image loaded event
        document.addEventListener('imageLoaded', function() {
            // Generate histogram when an image is loaded
            setTimeout(generateHistogram, 100); // Small delay to ensure image is fully processed
        });
    }

    // Set up histogram and threshold controls
    function setupHistogram() {
        if (!histogramCanvas) return;
        
        // Initialize histogram canvas
        const ctx = histogramCanvas.getContext('2d');
        if (!ctx) return;
        
        // Size the canvas properly
        function resizeHistogramCanvas() {
            const rect = histogramCanvas.parentNode.getBoundingClientRect();
            histogramCanvas.width = rect.width;
            histogramCanvas.height = rect.height;
        }
        
        // Call once to initialize
        resizeHistogramCanvas();
        
        // Listen for window resize
        window.addEventListener('resize', resizeHistogramCanvas);
        
        // Threshold handle drag events
        if (lowerThresholdHandle) {
            // Mouse down event for lower threshold
            lowerThresholdHandle.addEventListener('mousedown', function(e) {
                isDraggingLower = true;
                e.preventDefault();
            });
        }
        
        if (upperThresholdHandle) {
            // Mouse down event for upper threshold
            upperThresholdHandle.addEventListener('mousedown', function(e) {
                isDraggingUpper = true;
                e.preventDefault();
            });
        }
        
        // Mouse move event for threshold handles
        document.addEventListener('mousemove', function(e) {
            if (isDraggingLower || isDraggingUpper) {
                const container = histogramCanvas.parentNode;
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const containerWidth = rect.width;
                
                // Calculate threshold value from position (0-1)
                let threshold = Math.max(0, Math.min(1, x / containerWidth));
                
                if (isDraggingLower) {
                    // Ensure lower threshold doesn't exceed upper threshold
                    threshold = Math.min(threshold, window.sortConfig.upperThreshold - 0.01);
                    window.sortConfig.lowerThreshold = threshold;
                    lowerThresholdHandle.style.left = (threshold * 100) + '%';
                    lowerThresholdValue.textContent = threshold.toFixed(2);
                } else if (isDraggingUpper) {
                    // Ensure upper threshold doesn't fall below lower threshold
                    threshold = Math.max(threshold, window.sortConfig.lowerThreshold + 0.01);
                    window.sortConfig.upperThreshold = threshold;
                    upperThresholdHandle.style.left = (threshold * 100) + '%';
                    upperThresholdValue.textContent = threshold.toFixed(2);
                }
                
                drawHistogram(); // Redraw histogram with updated thresholds
            }
        });
        
        // Mouse up event to stop dragging
        document.addEventListener('mouseup', function() {
            isDraggingLower = false;
            isDraggingUpper = false;
        });
    }

    // Set up rotation direction control
    function setupRotationControl() {
        if (!rotationHandle) return;
        
        // Set initial rotation handle position
        rotationHandle.style.top = '50%';
        rotationHandle.style.left = '50%';
        rotationHandle.style.height = '40%';
        rotationHandle.style.transformOrigin = 'bottom center';
        rotationHandle.style.transform = 'translate(-50%, -100%) rotate(0deg)';
        
        // Handle rotation control interactions
        rotationContainer.addEventListener('mousedown', function(e) {
            isDraggingRotation = true;
            updateRotationFromEvent(e);
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isDraggingRotation) {
                updateRotationFromEvent(e);
            }
        });
        
        document.addEventListener('mouseup', function() {
            isDraggingRotation = false;
        });
        
        // Update rotation based on mouse position
        function updateRotationFromEvent(e) {
            if (!rotationContainer) return;
            
            const rect = rotationContainer.getBoundingClientRect();
            
            // Calculate center point (should be the same in both x and y since we're using a square)
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate angle from center to mouse
            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            
            // Calculate angle in degrees
            let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            
            // Normalize to 0-359 range
            angle = (angle + 360) % 360;
            
            // Round to nearest degree
            angle = Math.round(angle);
            
            // Update configuration
            window.sortConfig.angle = angle;
            
            // Update UI - only update the handle, not the canvas
            rotationHandle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
            if (rotationValueDisplay) {
                rotationValueDisplay.textContent = `${angle}°`;
            }
        }
    }

    // Generate histogram data from image
    function generateHistogram() {
        if (!window.imageCanvas || !histogramCanvas) return;
        
        // Reset histogram data
        histogramData = new Array(256).fill(0);
        
        // Get image data
        const ctx = window.imageCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, window.imageCanvas.width, window.imageCanvas.height);
        const data = imageData.data;
        
        // Count pixel values based on selected sort parameter
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            let value;
            switch (window.sortConfig.sortParameter) {
                case 'brightness':
                    value = Math.floor((r + g + b) / 3);
                    break;
                case 'saturation':
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    value = max === 0 ? 0 : Math.floor(((max - min) / max) * 255);
                    break;
                case 'hue':
                    const max2 = Math.max(r, g, b);
                    const min2 = Math.min(r, g, b);
                    if (max2 === min2) {
                        value = 0;
                    } else {
                        let hue;
                        if (max2 === r) {
                            hue = ((g - b) / (max2 - min2)) % 6;
                        } else if (max2 === g) {
                            hue = (b - r) / (max2 - min2) + 2;
                        } else {
                            hue = (r - g) / (max2 - min2) + 4;
                        }
                        value = Math.floor((hue / 6) * 255);
                    }
                    break;
                default:
                    value = Math.floor((r + g + b) / 3);
            }
            
            histogramData[value]++;
        }
        
        // Normalize histogram data
        const maxCount = Math.max(...histogramData);
        if (maxCount > 0) { // Avoid division by zero
            for (let i = 0; i < histogramData.length; i++) {
                histogramData[i] = histogramData[i] / maxCount;
            }
        }
        
        // Draw histogram
        drawHistogram();
        
        // Update threshold handles
        if (lowerThresholdHandle && upperThresholdHandle) {
            lowerThresholdHandle.style.left = (window.sortConfig.lowerThreshold * 100) + '%';
            upperThresholdHandle.style.left = (window.sortConfig.upperThreshold * 100) + '%';
            
            if (lowerThresholdValue && upperThresholdValue) {
                lowerThresholdValue.textContent = window.sortConfig.lowerThreshold.toFixed(2);
                upperThresholdValue.textContent = window.sortConfig.upperThreshold.toFixed(2);
            }
        }
    }

    // Draw histogram on canvas
    function drawHistogram() {
        if (!histogramCanvas || histogramData.length === 0) return;
        
        const ctx = histogramCanvas.getContext('2d');
        const width = histogramCanvas.width;
        const height = histogramCanvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw histogram bars
        const barWidth = width / histogramData.length;
        
        // Draw the histogram areas
        for (let i = 0; i < histogramData.length; i++) {
            const x = i * barWidth;
            const barHeight = histogramData[i] * height;
            const y = height - barHeight;
            
            // Determine color based on threshold regions
            const normalizedPos = i / 255;
            let color;
            
            if (normalizedPos >= window.sortConfig.lowerThreshold && normalizedPos <= window.sortConfig.upperThreshold) {
                // Value is within threshold range (will be sorted)
                color = 'rgba(75, 140, 255, 0.7)';
            } else {
                // Value is outside threshold range (won't be sorted)
                color = 'rgba(150, 150, 150, 0.5)';
            }
            
            ctx.fillStyle = color;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
        
        // Draw histogram outline
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        for (let i = 0; i < histogramData.length; i++) {
            const x = i * barWidth + barWidth / 2;
            const y = height - (histogramData[i] * height);
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();
        
        // Draw threshold lines
        ctx.beginPath();
        ctx.moveTo(window.sortConfig.lowerThreshold * width, 0);
        ctx.lineTo(window.sortConfig.lowerThreshold * width, height);
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(window.sortConfig.upperThreshold * width, 0);
        ctx.lineTo(window.sortConfig.upperThreshold * width, height);
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
        ctx.stroke();
    }

    // Initialize on page load
    initControls();
});