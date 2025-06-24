export default function TestRoute() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Test Route Working!</h1>
        <p className="text-gray-600 mb-4">If you can see this, the deployment process is working.</p>
        <a 
          href="/admin/quick-add-user" 
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Go to Quick Add User
        </a>
      </div>
    </div>
  );
}