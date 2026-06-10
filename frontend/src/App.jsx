import { Routes, Route, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Organisations from './components/Organisations'
import Forms from './components/Forms'
import FormBuilder from './components/FormBuilder'
import FormRenderer from './components/FormRenderer'
import FormSubmissions from './pages/FormSubmissions'
import Login from './pages/Login'
import ThankyouPage from './pages/ThankyouPage'
import PrivateRoute from './components/PrivateRoute'

function Nav() {
	const { isAuthenticated, user, logout, loading } = useAuth()

	return (
		<nav className='bg-white shadow-sm border-b'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between h-16'>
					<div className='flex items-center'>
						<h1 className='text-xl font-bold text-gray-900'>Dynamic Form Builder</h1>
					</div>
					<div className='flex items-center space-x-4'>
						{loading ? null : isAuthenticated ? (
							<>
								<Link to='/' className='text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium'>
									Organisations
								</Link>
								<Link to='/forms' className='text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium'>
									Forms
								</Link>
								<span className='text-sm text-gray-500 px-2'>{user?.name}</span>
								<button onClick={logout} className='text-red-600 hover:text-red-800 px-3 py-2 text-sm font-medium'>
									Logout
								</button>
							</>
						) : (
							<Link to='/login' className='text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium'>
								Login
							</Link>
						)}
					</div>
				</div>
			</div>
		</nav>
	)
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/" element={<PrivateRoute><Organisations /></PrivateRoute>} />
			<Route path="/forms" element={<PrivateRoute><Forms /></PrivateRoute>} />
			<Route path="/forms/new" element={<PrivateRoute><FormBuilder /></PrivateRoute>} />
			<Route path="/forms/:id/edit" element={<PrivateRoute><FormBuilder /></PrivateRoute>} />
			<Route path="/forms/:id/render" element={<FormRenderer />} />
			<Route path="/forms/:id/submissions" element={<PrivateRoute><FormSubmissions /></PrivateRoute>} />
			<Route path='/form-submitted' element={<ThankyouPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
	return (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	)
}
