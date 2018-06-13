import React from 'react'
import {Dimensions, StyleSheet} from 'react-native'
import PropTypes from 'prop-types'

import QrCodeScanner from 'react-native-qrcode-scanner'


export default class WelcomeScreen extends React.PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
    }

    static navigatorButtons = {
        rightButtons: [
            {
                component: 'AtomCodeAnnotations.HelpButton',
                passProps: {
                    deepLinkParams: {
                        link: 'AtomCodeAnnotations.HelpScreen',
                    },
                },
            }
        ]
    }

    constructor(props) {
        super(props)
        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent)
    }

    onNavigatorEvent = event => {
        const {type} = event
        if (type === 'DeepLink') {
            const {link} = event
            const {navigator} = this.props
            const title = (
                link
                .replace('AtomCodeAnnotations.', '')
                .replace('Screen', '')
            )
            navigator.push({
                screen: link,
                title,
            })
        }
    }

    render() {
        return <QrCodeScanner
            onRead={this.onRead}
            cameraStyle={styles.cameraContainer}
            topViewStyle={styles.zeroContainer}
            bottomViewStyle={styles.zeroContainer}
        />
    }

    onRead = async event => {
        const {navigator} = this.props
        const url = event.data
        navigator.push({
            screen: 'AtomCodeAnnotations.PhotoScreen',
            title: 'Photo',
            passProps: {
                url,
            },
        })
    }
}


const styles = StyleSheet.create({
    zeroContainer: {
        height: 0,
        flex: 0
    },
    cameraContainer: {
        height: Dimensions.get('window').height
    }
})
