import { createRoot } from "react-dom/client"
import { Home } from "./home"

const dom = document.getElementById("root")
const root = createRoot(dom)

const App = () => <><Home /></>
root.render(<App />)
