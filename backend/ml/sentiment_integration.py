import pickle
import pandas as pd
import numpy as np
import json
import sys
from pathlib import Path

class SentimentAnalyzer:
    def __init__(self, model_path, vectorizer_path):
        """Load ML model and vectorizer"""
        try:
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            with open(vectorizer_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
            print("✅ ML models loaded successfully")
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            raise
    
    def predict_text(self, text):
        """Predict sentiment for a single text"""
        try:
            # Vectorize text
            vectorized = self.vectorizer.transform([text])
            
            # Get prediction and probabilities
            prediction = self.model.predict(vectorized)[0]
            probabilities = self.model.predict_proba(vectorized)[0]
            
            # Map to readable labels - adjust based on your model
            # Common binary classification: 0=negative, 1=positive
            # Check your model's classes
            try:
                # Try to get class labels from the model
                if hasattr(self.model, 'classes_'):
                    if len(self.model.classes_) == 2:
                        # Binary classification
                        label_map = {0: 'negative', 1: 'positive'}
                    else:
                        # Multi-class or different labels
                        label_map = {i: str(cls) for i, cls in enumerate(self.model.classes_)}
                else:
                    # Default mapping
                    label_map = {0: 'negative', 1: 'positive'}
            except:
                label_map = {0: 'negative', 1: 'positive'}
            
            sentiment = label_map.get(prediction, 'neutral')
            confidence = float(max(probabilities))
            
            return {
                'text': text[:500],  # Limit text length
                'sentiment': sentiment,
                'confidence': confidence,
                'probabilities': {
                    'positive': float(probabilities[1]) if len(probabilities) > 1 else 0,
                    'negative': float(probabilities[0]) if len(probabilities) > 0 else 0
                }
            }
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                'text': text[:500],
                'sentiment': 'error',
                'confidence': 0.0,
                'probabilities': {'positive': 0, 'negative': 0},
                'error': str(e)
            }
    
    def process_file(self, filepath):
        """Process a file and return results"""
        try:
            # Read file based on type
            texts = []
            
            if filepath.endswith('.csv'):
                try:
                    df = pd.read_csv(filepath)
                    # Look for text column
                    text_columns = ['text', 'content', 'review', 'comment', 'message', 'tweet', 'sentence', 'body', 'description']
                    text_col = None
                    for col in text_columns:
                        if col in df.columns:
                            text_col = col
                            break
                    
                    if text_col:
                        texts = df[text_col].astype(str).tolist()
                    else:
                        # Try to find any column with string data
                        for col in df.columns:
                            if df[col].dtype == 'object':  # String column
                                texts = df[col].astype(str).tolist()
                                break
                        if not texts and len(df.columns) > 0:
                            texts = df.iloc[:, 0].astype(str).tolist()
                except Exception as e:
                    print(f"CSV read error: {e}")
                    return self.create_error_result(f"CSV error: {e}")
            
            elif filepath.endswith('.txt'):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        texts = [line.strip() for line in f if line.strip()]
                except UnicodeDecodeError:
                    try:
                        with open(filepath, 'r', encoding='latin-1') as f:
                            texts = [line.strip() for line in f if line.strip()]
                    except Exception as e:
                        print(f"TXT read error: {e}")
                        return self.create_error_result(f"TXT error: {e}")
            
            elif filepath.endswith('.json'):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # Handle different JSON structures
                        if isinstance(data, list):
                            texts = [str(item) for item in data if str(item).strip()]
                        elif isinstance(data, dict):
                            texts = [str(value) for value in data.values() if str(value).strip()]
                        else:
                            texts = [str(data)]
                except Exception as e:
                    print(f"JSON read error: {e}")
                    return self.create_error_result(f"JSON error: {e}")
            else:
                return self.create_error_result(f'Unsupported file format: {Path(filepath).suffix}')
            
            if not texts:
                return self.create_error_result('No valid text found in file')
            
            # Limit processing for very large files
            if len(texts) > 10000:
                texts = texts[:10000]  # Process only first 10,000 lines
                print(f"⚠️  Limiting to first 10,000 lines out of {len(texts)} total")
            
            # Process texts
            results = []
            positive_count = 0
            negative_count = 0
            neutral_count = 0
            error_count = 0
            confidence_scores = []
            
            print(f"📊 Processing {len(texts)} text entries...")
            
            for i, text in enumerate(texts):
                if text and text.strip():
                    result = self.predict_text(text.strip())
                    results.append(result)
                    
                    if result['sentiment'] == 'positive':
                        positive_count += 1
                    elif result['sentiment'] == 'negative':
                        negative_count += 1
                    elif result['sentiment'] == 'neutral':
                        neutral_count += 1
                    else:
                        error_count += 1
                    
                    if result['confidence'] > 0:
                        confidence_scores.append(result['confidence'])
                    
                    # Progress indicator for large files
                    if len(texts) > 1000 and i % 1000 == 0:
                        print(f"   Processed {i}/{len(texts)} lines...")
            
            print(f"✅ Processing complete: {len(results)} results")
            
            # Calculate statistics
            total_processed = len(results)
            avg_confidence = np.mean(confidence_scores) if confidence_scores else 0
            
            return {
                'success': True,
                'results': results,
                'statistics': {
                    'total_records': len(texts),
                    'processed_records': total_processed,
                    'positive_count': positive_count,
                    'negative_count': negative_count,
                    'neutral_count': neutral_count,
                    'error_count': error_count,
                    'positive_percentage': (positive_count / total_processed * 100) if total_processed > 0 else 0,
                    'negative_percentage': (negative_count / total_processed * 100) if total_processed > 0 else 0,
                    'neutral_percentage': (neutral_count / total_processed * 100) if total_processed > 0 else 0,
                    'average_confidence': float(avg_confidence),
                    'model_used': 'sentiment_model.pkl',
                    'vectorizer_used': 'tfidf_vectorizer.pkl'
                }
            }
            
        except Exception as e:
            print(f"❌ File processing error: {e}")
            return self.create_error_result(str(e))
    
    def create_error_result(self, error_message):
        """Create a standardized error response"""
        return {
            'success': False,
            'error': error_message,
            'results': [],
            'statistics': {
                'total_records': 0,
                'processed_records': 0,
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'error_count': 0,
                'positive_percentage': 0,
                'negative_percentage': 0,
                'neutral_percentage': 0,
                'average_confidence': 0,
                'model_used': 'sentiment_model.pkl',
                'vectorizer_used': 'tfidf_vectorizer.pkl'
            }
        }

def main():
    """Main function for Node.js integration"""
    if len(sys.argv) < 4:
        error_result = {
            'success': False,
            'error': 'Usage: python sentiment_integration.py <model_path> <vectorizer_path> <file_path> [output_path]',
            'results': [],
            'statistics': {}
        }
        print(json.dumps(error_result))
        sys.exit(1)
    
    model_path = sys.argv[1]
    vectorizer_path = sys.argv[2]
    file_path = sys.argv[3]
    output_path = sys.argv[4] if len(sys.argv) > 4 else None
    
    try:
        print(f"🚀 Starting ML processing...")
        print(f"   Model: {model_path}")
        print(f"   Vectorizer: {vectorizer_path}")
        print(f"   File: {file_path}")
        
        analyzer = SentimentAnalyzer(model_path, vectorizer_path)
        result = analyzer.process_file(file_path)
        
        if output_path:
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print(f"💾 Results saved to: {output_path}")
            except Exception as e:
                print(f"⚠️  Could not save to {output_path}: {e}")
        
        # Print result for Node.js to capture
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'results': [],
            'statistics': {
                'total_records': 0,
                'processed_records': 0,
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'error_count': 0,
                'positive_percentage': 0,
                'negative_percentage': 0,
                'neutral_percentage': 0,
                'average_confidence': 0
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
