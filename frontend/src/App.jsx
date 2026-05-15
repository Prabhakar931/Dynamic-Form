import { Routes, Route, Link } from 'react-router-dom'
import Organisations from './components/Organisations'
import Forms from './components/Forms'
import FormBuilder from './components/FormBuilder'
import FormRenderer from './components/FormRenderer'
import Students from './components/Students'
import Submissions from './components/Submissions'
import FormSubmissions from "./pages/FormSubmissions";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Dynamic Form Builder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Organisations</Link>
              <Link to="/forms" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Forms</Link>
              <Link to="/students" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Students</Link>
              <Link to="/submissions" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Submissions</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Organisations />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/forms/new" element={<FormBuilder />} />
          <Route path="/forms/:id/edit" element={<FormBuilder />} />
          <Route path="/forms/:id/render" element={<FormRenderer />} />
          <Route path="/students" element={<Students />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/forms/:id/submissions" element={<FormSubmissions />}/>
        </Routes>
      </main>
    </div>
  )
}
