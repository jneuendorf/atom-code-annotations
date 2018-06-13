import {Navigation} from 'react-native-navigation'

import {loadIcons} from './src/load-icons.js'
import HelpScreen from './src/screens/help'
import ScanQrCodeScreen from './src/screens/scan-qr-code'
import PhotoScreen from './src/screens/photo'
import ConfirmScreen from './src/screens/confirm'
import HelpButton from './src/help-button'



Navigation.registerComponent(
    'AtomCodeAnnotations.HelpScreen',
    () => HelpScreen
)
Navigation.registerComponent(
    'AtomCodeAnnotations.ScanQrCodeScreen',
    () => ScanQrCodeScreen
)
Navigation.registerComponent(
    'AtomCodeAnnotations.PhotoScreen',
    () => PhotoScreen
)
Navigation.registerComponent(
    'AtomCodeAnnotations.ConfirmScreen',
    () => ConfirmScreen
)

Navigation.registerComponent(
    'AtomCodeAnnotations.HelpButton',
    () => HelpButton
)


loadIcons()
.then(icons => {
    // Needed for static methods.
    global.icons = icons
    Navigation.startSingleScreenApp({
        screen: {
            title: 'Scan QR Code',
            screen: 'AtomCodeAnnotations.ScanQrCodeScreen',
        },
        passProps: {
            icons,
        },
    })
})
