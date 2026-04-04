import { login, signup } from './actions'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <form method="post" className="flex flex-col gap-4 w-full max-w-md p-8 border rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">Login or Sign Up</h1>
        
        <div className="flex flex-col gap-1">
          <label htmlFor="email">Email:</label>
          <input id="email" name="email" type="email" required className="border p-2 rounded text-black" />
        </div>
        
        <div className="flex flex-col gap-1">
          <label htmlFor="password">Password:</label>
          <input id="password" name="password" type="password" required className="border p-2 rounded text-black" />
        </div>
        
        <div className="flex gap-4 mt-4">
          <button type="submit" formAction={login} className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Log in</button>
          <button type="submit" formAction={signup} className="flex-1 bg-gray-200 text-black p-2 rounded hover:bg-gray-300">Sign up</button>
        </div>
      </form>
    </div>
  )
}