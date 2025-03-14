#!/usr/bin/env python
import os
import pandas as pd
import argparse
from typing import List, Dict, Any, Optional
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import tempfile

def filter_csv(input_file: str, output_file: str, include_extensions: List[str]) -> Optional[Dict[str, Any]]:
    """
    Filter a CSV file to keep only rows with domain names that end with specified extensions.
    
    Args:
        input_file: Path to the input CSV file
        output_file: Path to save the filtered CSV file
        include_extensions: List of domain extensions to include (e.g., ["com", "net", "org"])
    
    Returns:
        Dict with statistics about the filtering operation or None if an error occurred
    """
    # Add dots to extensions if not present
    normalized_extensions = [ext if ext.startswith(".") else f".{ext}" for ext in include_extensions]
    
    try:
        # Get the original file size
        original_size = os.path.getsize(input_file)
        
        # Read CSV file
        df = pd.read_csv(input_file)
        
        # Check if the 'name' column exists
        if 'name' not in df.columns:
            return {
                "success": False,
                "error": "CSV file must contain a column named 'name'."
            }
        
        # Count initial rows (excluding header)
        total_rows = len(df)
        
        # Filter to keep only rows where the 'name' field ends with any of the included extensions
        def should_keep(domain):
            if pd.isna(domain):
                return False  # Don't keep rows with null/NaN domain names
            
            # Convert domain to string and check if it ends with any of the extensions
            domain = str(domain).strip().lower()
            return any(domain.endswith(ext.lower()) for ext in normalized_extensions)
        
        filtered_df = df[df['name'].apply(should_keep)]
        
        # Count how many rows were removed
        rows_removed = total_rows - len(filtered_df)
        
        # Write filtered DataFrame to output CSV file
        filtered_df.to_csv(output_file, index=False)
        
        # Get the filtered file size
        filtered_size = os.path.getsize(output_file)
        
        # Calculate size reduction percentage
        size_reduction_percent = ((original_size - filtered_size) / original_size) * 100 if original_size > 0 else 0
        
        # Return statistics
        return {
            "success": True,
            "original_size": original_size,
            "filtered_size": filtered_size,
            "size_reduction_bytes": original_size - filtered_size,
            "size_reduction_percent": round(size_reduction_percent, 1),
            "total_rows": total_rows,
            "filtered_rows": len(filtered_df),
            "rows_removed": rows_removed,
            "extensions_included": normalized_extensions
        }
    except pd.errors.EmptyDataError:
        return {
            "success": False,
            "error": "The CSV file is empty or contains no data."
        }
    except pd.errors.ParserError:
        return {
            "success": False,
            "error": "Error parsing CSV file. Please ensure it's a valid CSV format."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }

def format_size(bytes_size):
    """Format file size in a human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024.0
    return f"{bytes_size:.2f} TB"

# Flask API Implementation
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/filter', methods=['POST'])
def api_filter_domains():
    # Check if file was uploaded
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400
    
    # Get extensions to filter (from form data)
    extensions = request.form.getlist('extensions')
    if not extensions:
        return jsonify({"success": False, "error": "No extensions specified"}), 400
    
    # Create temporary files
    temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    
    try:
        # Save uploaded file
        file.save(temp_input.name)
        
        # Process the file
        result = filter_csv(temp_input.name, temp_output.name, extensions)
        
        if not result or not result["success"]:
            error_msg = result.get("error", "Unknown error") if result else "Processing failed"
            return jsonify({"success": False, "error": error_msg}), 500
        
        # Decide whether to return statistics or file download based on query param
        return_stats = request.args.get('stats', 'false').lower() == 'true'
        
        if return_stats:
            return jsonify(result)
        else:
            return send_file(
                temp_output.name,
                as_attachment=True,
                download_name=f"filtered_{file.filename}",
                mimetype='text/csv'
            )
    finally:
        # Clean up temporary files after sending the response
        temp_input.close()
        temp_output.close()
        try:
            os.unlink(temp_input.name)
            os.unlink(temp_output.name)
        except Exception as e:
            print(f"Warning: Error during cleanup: {e}")  # Log the error instead of silently ignoring it
            pass  # Continue execution even if cleanup fails

if __name__ == '__main__':
    # Check if we should run in API mode or CLI mode
    import argparse
    parser = argparse.ArgumentParser(description='Domain Filter Script')
    parser.add_argument('--api', action='store_true', help='Run as API server')
    args = parser.parse_args()
    
    if args.api:
        # Run as API server
        port = 8080  # Use port 8080 to avoid conflicts
        print(f"Starting API server on http://localhost:{port}")
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        # Run as CLI tool
        import sys
        if len(sys.argv) < 3:
            print("Usage: python script.py <input_csv> <output_csv> [extensions_to_include]")
            sys.exit(1)
        
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        include_extensions = sys.argv[3].split(',') if len(sys.argv) > 3 else []
        
        result = filter_csv(input_file, output_file, include_extensions)
        if result:
            print(f"Filtering complete. Processed {result['total_rows']} rows.")
            print(f"Kept {result['filtered_rows']} rows with extensions: {', '.join(include_extensions)}")
            print(f"Removed {result['rows_removed']} rows")
            print(f"Output saved to: {output_file}")
        else:
            print("Filtering failed.")