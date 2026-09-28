import { createRoot } from 'react-dom/client';
import Worksheet from './worksheet';
import AccountApp from './AccountApp';
import {cloudClient} from './cloud-client';
import './globals.css';
createRoot(document.getElementById('root')!).render(cloudClient ? <AccountApp client={cloudClient}/> : <Worksheet />);
