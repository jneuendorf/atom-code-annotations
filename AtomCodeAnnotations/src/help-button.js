import React from 'react'
import {Image, StyleSheet, TouchableOpacity} from 'react-native'
import PropTypes from 'prop-types'
import {Navigation} from 'react-native-navigation'


export default class HelpButton extends React.PureComponent {
    static propTypes = {
        deepLinkParams: PropTypes.object.isRequired,
    }

    render() {
        return <TouchableOpacity onPress={this.onPress}>
            <Image
                source={global.icons['ios-help-circle-outline']}
                style={styles.buttonSize}
            />
        </TouchableOpacity>
    }

    onPress = () => {
        const {deepLinkParams} = this.props
        Navigation.handleDeepLink(deepLinkParams)
    }
}

const styles = StyleSheet.create({
    buttonSize: {
        height: 25,
        width: 25,
    },
})
