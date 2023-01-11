import { useState, useEffect } from 'react'

import Pilot from './components/Pilot'
import getAll from './services/pilots'

const App = () => {
  const [pilots, setPilots] = useState([])

  useEffect(() => {
    getAll()
      .then(currentPilots => setPilots(currentPilots))
  })

  return (
    <div>
      <h1>Violating pilots in the last 10 minutes</h1>
      <ul>
        {pilots.sort((first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt)
        ).map(pilot =>
          <Pilot 
            key={pilot.id}
            pilot={pilot}
          />
        )}
      </ul>
    </div>
  )
}

export default App;
