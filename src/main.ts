import { CombatGameApp } from './CombatGameApp'
import './styles.css'

const root = document.querySelector<HTMLElement>('#app')
if (!root) throw new Error('Aethoria startup failed: #app is missing from index.html.')
new CombatGameApp(root).start()
