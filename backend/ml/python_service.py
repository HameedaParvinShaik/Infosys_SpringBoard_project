# ml/python_service.py
"""
Python service for sentiment analysis that can be called from Node.js
"""

import os
import json
import sys
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from universal_sentiment import UniversalSentimentAnalyzer

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize analyzer
print("🚀 Starting Python Sentiment Analysis Service...")
analyzer = UniversalSentimentAnalyzer()
print("✅ Sentiment analyzer initialized")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "sentiment-analysis",
        "model_source": analyzer.sentiment_analyzer.model_source
    })

@app.route('/analyze/text', methods=['POST'])
def analyze_text():
    """Analyze text from request"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                "success": False,
                "error": "No text provided"
            }), 400
        
        text = data['text']
        results = analyzer.analyze_text(text)
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/analyze/batch', methods=['POST'])
def analyze_batch():
    """Analyze multiple texts"""
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({
                "success": False,
                "error": "No texts provided"
            }), 400
        
        texts = data['texts']
        
        if not isinstance(texts, list):
            return jsonify({
                "success": False,
                "error": "Texts must be an array"
            }), 400
        
        # Limit for performance
        max_texts = data.get('max_texts', 1000)
        texts = texts[:max_texts]
        
        results = analyzer.sentiment_analyzer.analyze_batch(texts)
        
        return jsonify({
            "success": True,
            "total_texts": len(texts),
            "analysis": results
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/analyze/file', methods=['POST'])
def analyze_file():
    """Analyze uploaded file"""
    try:
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file uploaded"
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        # Save file temporarily
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, file.filename)
        file.save(file_path)
        
        try:
            # Get parameters
            text_column = request.form.get('text_column')
            max_texts = int(request.form.get('max_texts', 1000))
            
            # Analyze file
            results = analyzer.analyze_file(file_path, text_column, max_texts)
            
            # Clean up
            if os.path.exists(file_path):
                os.remove(file_path)
            
            return jsonify(results), 200
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({
                "success": False,
                "error": f"File processing error: {str(e)}"
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/formats', methods=['GET'])
def get_formats():
    """Get supported file formats"""
    formats = [
        {"extension": ".txt", "name": "Text File"},
        {"extension": ".csv", "name": "CSV"},
        {"extension": ".xlsx", "name": "Excel"},
        {"extension": ".xls", "name": "Excel (old)"},
        {"extension": ".pdf", "name": "PDF"},
        {"extension": ".docx", "name": "Word"},
        {"extension": ".json", "name": "JSON"}
    ]
    
    return jsonify({
        "success": True,
        "formats": formats
    })

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 5001))
    print(f"🌐 Python service running on http://localhost:{port}")
    print("📁 Supported file formats: PDF, DOC, CSV, Excel, TXT, JSON")
    app.run(host='0.0.0.0', port=port, debug=False)
