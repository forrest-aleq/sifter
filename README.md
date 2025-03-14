# Siftr - Domain TLD Filtering Tool

Siftr is a powerful web application that allows you to filter CSV files containing domain names based on their Top-Level Domains (TLDs). The tool uses an inclusion-based approach, letting you select which TLDs you want to keep in your dataset.

## Features

- **CSV File Upload**: Easily upload CSV files containing domain names
- **TLD Inclusion Filtering**: Select which TLDs you want to keep (e.g., .com, .io, .ai)
- **Real-time Processing**: See immediate results with progress indicators
- **Detailed Statistics**: View information about the filtering process, including file size reduction and row counts
- **Download Results**: Export the filtered data as a new CSV file

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python (v3.6 or higher)
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/siftr.git
   cd siftr
   ```

2. Install frontend dependencies:
   ```
   npm install
   ```

3. Install backend dependencies:
   ```
   pip install flask flask-cors pandas
   ```

### Running the Application

1. Start the backend server:
   ```
   python script.py --api
   ```
   This will start the Flask API server on http://localhost:8080

2. Start the frontend development server:
   ```
   npm run dev
   ```
   This will start the Next.js development server on http://localhost:3000

3. Open your browser and navigate to http://localhost:3000

## Usage

1. **Upload a CSV File**: Click the upload area or drag and drop a CSV file. The file must contain a column named "name" with domain names.

2. **Select TLDs to Keep**: Choose which Top-Level Domains you want to include in your filtered results. Only domains with these TLDs will be kept.

3. **Apply Filtering**: Click the "Keep Selected TLDs" button to process your file.

4. **Download Results**: Once processing is complete, download the filtered CSV file containing only domains with your selected TLDs.

## Technical Details

### Frontend

- Built with Next.js and React
- Uses Tailwind CSS for styling
- Implements a responsive design for all device sizes

### Backend

- Python Flask API
- Pandas for CSV processing
- RESTful endpoints for file processing

## API Endpoints

- `POST /api/filter`: Processes a CSV file and filters domains based on selected TLDs
  - Request: Multipart form with 'file' (CSV file) and 'extensions' (array of TLDs to include)
  - Response: Filtered CSV file or statistics JSON

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with ❤️ for domain management professionals
- Special thanks to all contributors
