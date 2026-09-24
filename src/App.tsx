import { supabase } from './lib/supabase'

function App() {
  console.log('Supabase:', supabase)

  return (
    <div className="flex min-h-screen items-center justify-center bg-pink-50">
      <h1 className="text-4xl font-bold text-pink-600">
        OUR PLACES ♡
      </h1>
    </div>
  )
}

export default App
