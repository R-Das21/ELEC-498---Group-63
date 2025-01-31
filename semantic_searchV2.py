import numpy as np
from openai import OpenAI
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
import tiktoken
import sys
from typing import List, Tuple
import time

class AcademicSearchEngine:
    def __init__(self, embeddings_path: str, papers_path: str):
        """
        Initialize the academic search engine.
        
        Args:
            embeddings_path: Path to the numpy file containing paper embeddings
            papers_path: Path to the CSV file containing paper information
        """
        self.client = OpenAI(api_key= '')
        self.model = "gpt-4o"
        self.embedding_model = "text-embedding-ada-002"
        
        # Load data
        print("Loading embeddings and papers...")
        self.embeddings = np.load(embeddings_path)
        self.papers_df = pd.read_csv(papers_path)
        
        # System prompt for academic focus
        self.system_prompt = """You are an academic research assistant. Your role is to help users find relevant academic papers 
        and research materials."""

    def get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for a text using OpenAI's API."""
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return np.array(response.data[0].embedding)
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return None

    def find_similar_papers(self, query_embedding: np.ndarray, top_k: int = 1) -> List[Tuple[int, float]]:
        """Find most similar papers using cosine similarity."""
        similarities = cosine_similarity(query_embedding.reshape(1, -1), self.embeddings)[0]
        top_indices = similarities.argsort()[-top_k:][::-1]
        return [(idx, similarities[idx]) for idx in top_indices]

    def format_results(self, similar_papers: List[Tuple[int, float]]) -> str:
        """Format search results into a readable string."""
        results = []
        for idx, similarity in similar_papers:
            paper = self.papers_df.iloc[idx]
            result = f"\nSimilarity Score: {similarity:.3f}\n"
            result += f"Title: {paper.get('title', 'N/A')}\n"
            result += f"Abstract: {paper.get('text', 'N/A')[:300]}...\n"
            result += "-" * 80
            results.append(result)
        return "\n".join(results)

    def process_query(self, user_query: str) -> str:
        """Process user query and return response using GPT-4."""
        try:
            # First, check if query is academic-related using GPT-4
            # Get embedding for the query
            query_embedding = self.get_embedding(user_query)
            if query_embedding is None:
                return "Sorry, there was an error processing your query. Please try again."

            # Find similar papers
            similar_papers = self.find_similar_papers(query_embedding)
            results = self.format_results(similar_papers)

            # Generate response using GPT-4
            chat_response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"""Based on the following query and search results, provide a scholarly analysis 
                    of how these papers relate to the query. Be specific about why each paper is relevant.
                    
                    Query: {user_query}
                    
                    Search Results: {results}"""}
                ]
            )

            final_response = f"""Search Results Analysis:
            {chat_response.choices[0].message.content}
            
            Detailed Results:
            {results}"""

            return final_response

        except Exception as e:
            return f"An error occurred: {str(e)}"

def main():
    # Initialize paths
    EMBEDDINGS_PATH = "C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/paper_embeddings.npy"
    PAPERS_PATH = "C:/Users/rishi/OneDrive/Desktop/ELEC498 Project FIles/citeulike-t-master/citeulike-t-master/papers.csv"
    
    try:
        # Initialize search engine
        search_engine = AcademicSearchEngine(EMBEDDINGS_PATH, PAPERS_PATH)
        print("Academic Search Engine initialized. Type 'quit' to exit.")
        
        while True:
            # Get user input
            user_query = input("\nEnter your academic research query: ").strip()
            
            # Check for exit command
            if user_query.lower() == 'quit':
                print("Thank you for using the Academic Search Engine. Goodbye!")
                break
                
            # Process query and display results
            if user_query:
                print("\nProcessing your query...\n")
                response = search_engine.process_query(user_query)
                print(response)
            
            # Add a small delay for readability
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nSearch session terminated by user. Goodbye!")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()