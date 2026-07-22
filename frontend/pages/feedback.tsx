import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Star, MessageSquare } from 'lucide-react';

interface User {
  name: string;
}

export default function Feedback() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  
  // Rating state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.name,
          rating,
          comments,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Redirect to thank you page
      router.push('/thankyou');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
      <Head>
        <title>Power2Go - Customer Feedback</title>
      </Head>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
            We Value Your Feedback
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Rate your charging experience and let us know your queries.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 42, 95, 0.1)',
            border: '1px solid var(--accent-red)',
            color: 'white',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Star Rating Widget */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Rate our service (1 to 5 Stars)
            </span>
            <div className="star-rating" style={{ display: 'flex', gap: '10px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    width: '40px',
                    height: '40px',
                    strokeWidth: '1.5px',
                    cursor: 'pointer',
                    fill: (hoverRating || rating) >= star ? 'var(--accent-orange)' : 'transparent',
                    color: (hoverRating || rating) >= star ? 'var(--accent-orange)' : 'var(--text-muted)',
                    filter: (hoverRating || rating) >= star ? 'drop-shadow(0 0 8px var(--accent-orange-glow))' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent!'}
            </span>
          </div>

          {/* Comment / Command Box */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Command Box (Any queries, issues or suggestions?)
            </label>
            <div style={{ position: 'relative' }}>
              <MessageSquare style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)', width: '18px' }} />
              <textarea
                className="glass-input"
                style={{ paddingLeft: '40px', minHeight: '120px', resize: 'vertical' }}
                placeholder="Write your comments or questions here..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="glass-button" style={{ marginTop: '10px' }}>
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
