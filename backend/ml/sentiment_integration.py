import pickle
import pandas as pd
import numpy as np
import json
import sys
from pathlib import Path
from datetime import datetime

class SentimentAnalyzer:
    def __init__(self, model_path, vectorizer_path):
        try:
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            with open(vectorizer_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
        except Exception as e:
            raise Exception(f"Error loading models: {e}")
    
    def predict_text(self, text):
        try:
            vectorized = self.vectorizer.transform([text])
            prediction = self.model.predict(vectorized)[0]
            probabilities = self.model.predict_proba(vectorized)[0] if hasattr(self.model, 'predict_proba') else [1.0]

            # Map to readable labels
            label_map = {i: str(cls) for i, cls in enumerate(getattr(self.model, 'classes_', ['negative','positive']))}
            sentiment = label_map.get(prediction, 'neutral')
            confidence = float(max(probabilities))

            return {
                'text': text[:500],
                'originalText': text[:500],
                'sentiment': sentiment,
                'confidence': confidence,
                'probabilities': {
                    'positive': float(probabilities[1]) if len(probabilities) > 1 else 0,
                    'negative': float(probabilities[0]) if len(probabilities) > 0 else 0
                },
                'patternsFound': [],
                'metadata': {
                    'length': len(text),
                    'wordCount': len(text.split()),
                    'processedAt': datetime.now().isoformat()
                }
            }
        except Exception as e:
            return {
                'text': text[:500],
                'originalText': text[:500],
                'sentiment': 'error',
                'confidence': 0.0,
                'probabilities': {'positive': 0, 'negative': 0},
                'patternsFound': [],
                'metadata': {
                    'length': len(text),
                    'wordCount': len(text.split()),
                    'processedAt': datetime.now().isoformat()
                },
                'error': str(e)
            }

    def process_file(self, filepath):
        texts = []

        try:
            if filepath.endswith('.csv'):
                df = pd.read_csv(filepath)
                for col in ['text','content','review','comment','message','tweet','sentence','body','description']:
                    if col in df.columns:
                        texts = df[col].astype(str).tolist()
                        break
                if not texts:
                    texts = df.iloc[:,0].astype(str).tolist()
            elif filepath.endswith('.txt'):
                with open(filepath, 'r', encoding='utf-8') as f:
                    texts = [line.strip() for line in f if line.strip()]
            elif filepath.endswith('.json'):
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        texts = [str(item) for item in data if str(item).strip()]
                    elif isinstance(data, dict):
                        texts = [str(v) for v in data.values() if str(v).strip()]
                    else:
                        texts = [str(data)]
            else:
                return self.create_error_result(f'Unsupported file format: {Path(filepath).suffix}')
            
            if not texts:
                return self.create_error_result('No valid text found in file')
            
            if len(texts) > 10000:
                texts = texts[:10000]
            
            results = [self.predict_text(t) for t in texts]

            # Compute statistics
            positive_count = sum(1 for r in results if r['sentiment']=='positive')
            negative_count = sum(1 for r in results if r['sentiment']=='negative')
            neutral_count = sum(1 for r in results if r['sentiment']=='neutral')
            confidence_scores = [r['confidence'] for r in results if r['confidence']>0]
            avg_confidence = float(np.mean(confidence_scores)) if confidence_scores else 0

            return {
                'success': True,
                'results': results,
                'statistics': {
                    'total_records': len(texts),
                    'processed_records': len(results),
                    'positive_count': positive_count,
                    'negative_count': negative_count,
                    'neutral_count': neutral_count,
                    'average_confidence': avg_confidence,
                    'model_used': 'sentiment_model.pkl',
                    'vectorizer_used': 'tfidf_vectorizer.pkl'
                }
            }
        except Exception as e:
            return self.create_error_result(str(e))
    
    def create_error_result(self, msg):
        return {
            'success': False,
            'error': msg,
            'results': [],
            'statistics': {
                'total_records': 0,
                'processed_records': 0,
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'average_confidence': 0,
                'model_used': 'sentiment_model.pkl',
                'vectorizer_used': 'tfidf_vectorizer.pkl'
            }
        }

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'success': False, 'error':'Usage: python sentiment_integration.py <model> <vectorizer> <file>', 'results':[], 'statistics':{}}))
        sys.exit(1)
    
    model_path, vectorizer_path, file_path = sys.argv[1:4]
    output_path = sys.argv[4] if len(sys.argv)>4 else None

    analyzer = SentimentAnalyzer(model_path, vectorizer_path)
    result = analyzer.process_file(file_path)

    if output_path:
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        except:
            pass

    # Output JSON for Node.js to capture
    print(json.dumps(result))

if __name__ == "__main__":
    main()
