import React from 'react'
import {
    Alert,
    Button,
    Dimensions,
    Image,
    Text,
    TextInput,
    View,
} from 'react-native'
import PropTypes from 'prop-types'
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view'

import Styles, {rawStyles} from '../styles'


const {alert} = Alert
const noop = () => {}


export default class ConfirmScreen extends React.PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        image: PropTypes.shape({
            uri: PropTypes.string.isRequired,
            dataUrl: PropTypes.string.isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }).isRequired,
        server: PropTypes.shape({
            url: PropTypes.string.isRequired,
        }).isRequired,
    }

    state = {
        title: '',
    }

    render() {
        const {
            image: {
                uri,
                width,
                height
            },
        } = this.props
        const {title} = this.state
        const screenWidth = Dimensions.get('window').width
        const scaleFactor = width / screenWidth
        const imageHeight = height / scaleFactor
        return <KeyboardAwareScrollView style={Styles.container}>
            <Image
                source={{uri}}
                style={{
                    width: screenWidth,
                    height: imageHeight,
                }}
            />
            <View style={[Styles.section, Styles.row]}>
                <Text style={Styles.rowItem}>Title</Text>
                <TextInput
                    autoCapitalize='none'
                    autoCorrect={false}
                    placeholder='optional'
                    value={title}
                    onChangeText={this.handleChangeTitle}
                />
            </View>
            <View style={[
                Styles.sectionNoBorder,
                Styles.row,
                {
                    justifyContent: 'space-evenly',
                },
            ]}>
                <Button
                    onPress={this.addAnnotation}
                    title='Use photo'
                />
                <Button
                    onPress={this.takeAnotherPhoto}
                    title='Discard'
                    color={rawStyles.red}
                />
            </View>
        </KeyboardAwareScrollView>
    }

    handleChangeTitle = title => {
        this.setState({title})
    }

    addAnnotation = async () => {
        const {image, server, navigator} = this.props
        const {title} = this.state
        const response = await fetch(server.url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                content: image.dataUrl,
            }),
        })
        const result = await response.text()
        if (result === 'success') {
            alert(
                'Success',
                'The image is now an annotation.',
                [
                    {text: 'OK', onPress: noop},
                    {text: 'Add another one', onPress: () => {
                        navigator.pop()
                    }},
                ]
            )
        }
        else {
            alert(
                'Failure',
                (
                    'The image could not be sent or an error occured '
                    + 'while adding the annotation to Atom.'
                ),
                [
                    {text: 'Show error', onPress: () => {
                        alert('Error message', result)
                    }},
                    {text: 'OK', onPress: noop},
                ]
            )
            console.error(result)
        }
    }

    takeAnotherPhoto = () => {
        const {navigator} = this.props
        navigator.pop()
    }
}
