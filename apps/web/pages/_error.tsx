import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1rem',
        }}>
          {statusCode || 'Error'}
        </h1>
        <p style={{
          color: '#4b5563',
          marginBottom: '2rem',
        }}>
          {statusCode
            ? `An error ${statusCode} occurred on server`
            : 'An error occurred on client'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
