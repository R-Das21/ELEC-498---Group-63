import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt
import pandas as pd
from scipy.spatial.distance import pdist, squareform
#embeddings_path = "C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/paper_embeddings.npy"
# Path to your original CSV file with the texts
#df = pd.read_csv("C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/papers.csv")

def validate_embeddings(embeddings_path, texts_df, n_samples=1000):
    """
    Comprehensive validation of embeddings quality.
    
    Args:
        embeddings_path: Path to the .npy file containing embeddings
        texts_df: DataFrame containing the original texts
        n_samples: Number of random samples to use for analysis
    """
    # Load embeddings
    embeddings = np.load(embeddings_path)
    
    # Basic checks
    print("\n=== Basic Validation ===")
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Number of zero vectors: {np.sum(np.all(embeddings == 0, axis=1))}")
    print(f"Mean magnitude: {np.mean(np.linalg.norm(embeddings, axis=1))}")
    
    # Check for NaN values
    print(f"Number of NaN values: {np.isnan(embeddings).sum()}")
    
    # Sample some embeddings for detailed analysis
    indices = np.random.choice(len(embeddings), min(n_samples, len(embeddings)), replace=False)
    sample_embeddings = embeddings[indices]
    sample_texts = texts_df.iloc[indices]
    
    # Compute similarity matrix
    similarity_matrix = cosine_similarity(sample_embeddings)
    
    # Compute statistics
    print("\n=== Similarity Statistics ===")
    similarities = similarity_matrix[np.triu_indices(len(similarity_matrix), k=1)]
    print(f"Average similarity: {np.mean(similarities):.3f}")
    print(f"Similarity std dev: {np.std(similarities):.3f}")
    print(f"Min similarity: {np.min(similarities):.3f}")
    print(f"Max similarity: {np.max(similarities):.3f}")
    
    # Visualize similarity distribution
    plt.figure(figsize=(10, 5))
    plt.hist(similarities, bins=50)
    plt.title('Distribution of Cosine Similarities')
    plt.xlabel('Cosine Similarity')
    plt.ylabel('Frequency')
    plt.show()
    
    # Create t-SNE visualization
    tsne = TSNE(n_components=2, random_state=42)
    embeddings_2d = tsne.fit_transform(sample_embeddings)
    
    plt.figure(figsize=(10, 10))
    plt.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], alpha=0.5)
    plt.title('t-SNE Visualization of Embeddings')
    plt.xlabel('t-SNE 1')
    plt.ylabel('t-SNE 2')
    plt.show()
    
    return indices, similarity_matrix

def find_similar_texts(index, indices, similarity_matrix, texts_df, n=5):
    """
    Find most similar texts for a given sample index.
    """
    similarities = similarity_matrix[index]
    most_similar = np.argsort(similarities)[-n:][::-1]
    
    print("\n=== Similar Texts Analysis ===")
    for i, similar_idx in enumerate(most_similar):
        original_idx = indices[similar_idx]
        print(f"\nSimilarity Score: {similarities[similar_idx]:.3f}")
        print(f"Text {i+1}: {texts_df.iloc[original_idx]['text'][:200]}...")

# Usage example:
if __name__ == "__main__":
    # Load your data
    embeddings_path = "C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/paper_embeddings.npy"
    df = pd.read_csv("C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/papers.csv")
    
    # Run validation
    indices, similarity_matrix = validate_embeddings(embeddings_path, df)
    
    # Analyze similar texts for a random sample
    random_sample = np.random.randint(len(indices))
    find_similar_texts(random_sample, indices, similarity_matrix, df)