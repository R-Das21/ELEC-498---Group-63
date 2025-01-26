from flask import Flask, request, jsonify
import time

app = Flask(__name__)


@app.route('/search', methods=['POST'])
def search():
    query = request.json.get('query')
    if not query or query.strip() == '':
        return jsonify({'error': 'You have not entered any keywords'}), 400
    # 模拟异步操作
    time.sleep(2)
    sample_results = [
        {
            "title": f"Paper: {query} - Result 1",
            "author": "Author A",
            "year": 2023,
            "abstract": f"This is a sample abstract containing \"{query}\".",
            "relevance": 0.95
        },
        {
            "title": f"Paper: {query} - Result 2",
            "author": "Author B",
            "year": 2022,
            "abstract": f"Another example abstract with \"{query}\".",
            "relevance": 0.88
        }
    ]
    return jsonify({'results': sample_results})


if __name__ == '__main__':
    app.run(debug=True)