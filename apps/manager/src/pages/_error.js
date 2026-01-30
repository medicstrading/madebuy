// Minimal error page to override Next.js built-in which imports Html from next/document
// App Router handles errors via app/error.tsx and app/not-found.tsx
function Error() {
  return null
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
