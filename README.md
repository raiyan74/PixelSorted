# Enhanced Pixel Sorter

An advanced web-based pixel sorting application inspired by C++ implementation with advanced features.

## Features

### Sorting Parameters and Types
- **Multiple Sorting Parameters**: Sort pixels by brightness, hue, or saturation
- **Threshold-Based Sorting**: Sort pixels that fall within a specified threshold range
- **Random Sorting**: Create more interesting patterns with randomized interval lengths
- **Dual Thresholds**: Use both lower and upper thresholds for more precise control

### Directional Controls
- **Sort Direction**: Choose from four directions (right, left, up, down)
- **Rotation**: Rotate the image before sorting to change the angle of sorted pixel lines

### Masking
- **Mask Support**: Use masks to selectively apply pixel sorting to specific areas
- **Mask Creation**: Generate masks from the loaded image based on brightness
- **Mask Import**: Load external images as masks
- **Mask Inversion**: Invert masks to quickly change which areas are affected

### Performance
- **Multi-threading Simulation**: Process the image in parallel chunks to improve performance
- **Falloff Control**: Randomly skip intervals to create more varied effects

## Technical Implementation

The core pixel sorting algorithm has been rewritten from the C++ version to JavaScript, maintaining the same functionality:

1. **Pre-Processing**:
   - Apply rotation if needed
   - Load mask if specified

2. **Processing**:
   - Divide the image into rows/columns based on the sort direction
   - Simulate multi-threading by processing chunks of rows/columns
   - For each row/column:
     - Identify intervals of pixels that meet the threshold criteria
     - Sort pixels in each interval according to the chosen parameter
     - Apply falloff chance to randomly skip intervals

3. **Interval Sorting**:
   - Extract pixels in the interval
   - Sort them based on the selected parameter (brightness, hue, saturation)
   - Apply sort direction (ascending or descending)
   - Place sorted pixels back into the image

4. **Post-Processing**:
   - Rotate back if needed
   - Crop to original size

## User Interface

The new UI provides full control over all sorting parameters:

- **Menu System**: File and mask operations in dropdown menus
- **Parameter Selection**: Choose sorting parameter, type, and direction
- **Threshold Controls**: Adjust lower and upper thresholds
- **Rotation**: Set precise rotation angle
- **Performance Controls**: Configure thread count and falloff chance
- **Mask Controls**: Adjust mask opacity and threshold
- **Status Bar**: View progress and status messages

## Files

- `index.html`: Main application structure with controls
- `style.css`: Styling for the application interface
- `script.js`: Main application logic
- `pixelSorterAlgorithms.js`: Core pixel sorting implementation

## Implementation Notes

1. **Rotation Handling**:
   - Calculates proper padding for rotation
   - Handles coordinate mapping between rotated and unrotated space for masking

2. **Mask Processing**:
   - Properly maps mask coordinates to image coordinates, accounting for rotation
   - Applies alpha-based masking with adjustable threshold

3. **Simulated Threading**:
   - Divides image into chunks to simulate multi-threaded processing
   - Improves perceived performance for large images

4. **Performance Considerations**:
   - Optimized interval detection and sorting
   - Progress feedback during processing
   - Image smoothing disabled for pixel-perfect rendering

## Getting Started

1. Clone the repository
2. Open index.html in a modern web browser
3. Open an image using the File menu
4. Adjust sorting parameters as desired
5. Click "Apply Pixel Sorting" to process the image
6. Save the result using the File menu

## Credits

Based on the C++ pixel sorting implementation, converted to a web-based application.