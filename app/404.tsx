export default function NotFound() {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        <h1>404 - Not Found</h1>
        <p>You do not have access to this application.<br />
        Please login to WEAM to continue.</p>
        <a href="https://app.weam.ai/login" target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 32,
            padding: '12px 32px',
            backgroundColor: '#8B5CF6', // Tailwind purple-500
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 0.5,
            boxShadow: '0 2px 6px rgba(139,92,246,0.15)',
            transition: 'background 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = '#7C3AED')}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = '#8B5CF6')}
        >
          Login to WEAM
        </a>
      </div>
    );
}