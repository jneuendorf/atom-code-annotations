import React, {Fragment} from 'react'
import {
    ActivityIndicator,
    Button,
    Dimensions,
    Image,
    Slider,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import PropTypes from 'prop-types'
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view'
import {RNCamera} from 'react-native-camera'

import Styles from '../styles'


const initialQuality = 0.98


export default class PhotoScreen extends React.PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
    }

    state = {
        targetEditor: '',
        flashMode: 'off',
        quality: initialQuality,
        desiredWidth: 1280,
    }
    camera = null

    constructor(props) {
        super(props)
        this.timer = setInterval(this.fetch, 2000)
    }

    render() {
        const {targetEditor, flashMode, desiredWidth} = this.state
        if (!targetEditor) {
            return <Fragment>
                <View style={[
                    Styles.sectionNoBorder,
                    Styles.centeredSpaced,
                ]}>
                    <Text>Open a text file in Atom.</Text>
                </View>
                <View style={[
                    Styles.sectionNoBorder,
                    Styles.centeredSpaced,
                ]}>
                    <ActivityIndicator size='large' />
                </View>
            </Fragment>
        }

        const screenWidth = Dimensions.get('window').width
        return <KeyboardAwareScrollView style={Styles.container}>
            <View style={Styles.section}>
                <Text>
                    Annotating <Text style={Styles.bold}>{targetEditor}</Text>
                </Text>
            </View>
            <RNCamera
                ref={element => this.camera = element}
                type={RNCamera.Constants.Type.back}
                flashMode={RNCamera.Constants.FlashMode[flashMode]}
                // android
                permissionDialogTitle={'Permission to use camera'}
                permissionDialogMessage={'The camera is used for scanning the QR code and taking photos sent to Atom.'}
                style={{
                    height: screenWidth,
                    width: screenWidth,
                }}
            />
            <View style={[
                Styles.section,
                Styles.row,
                Styles.centeredSpaced,
            ]}>
                {['auto', 'on', 'off'].map(mode => {
                    return <TouchableOpacity
                        key={mode}
                        onPress={() => this.setFlashMode(mode)}
                    >
                        <Image
                            source={global.icons[
                                `flash-${mode}`
                                + (
                                    flashMode === mode
                                    ? '--active'
                                    : ''
                                )
                            ]}
                            style={Styles.icon}
                        />
                    </TouchableOpacity>
                })}
            </View>
            <View style={Styles.section}>
                <Button
                    onPress={this.takeAndConfirmPhoto}
                    title='Take photo'
                />
            </View>
            <View style={Styles.section}>
                <Text>Quality</Text>
                <Slider
                    value={initialQuality}
                    onSlidingComplete={this.setQuality}
                />
            </View>
            <View style={[Styles.section, Styles.row]}>
                <Text style={Styles.rowItem}>Width</Text>
                <TextInput
                    keyboardType='numeric'
                    value={`${desiredWidth}`}
                    onChangeText={this.setDesiredWidth}
                    maxLength={4}
                />
            </View>
        </KeyboardAwareScrollView>
    }

    componentWillUnmount() {
        clearInterval(this.timer)
    }

    fetch = async () => {
        const {url} = this.props
        console.log('fetch from', url)
        const response = await fetch(url, {
            method: 'get',
        })
        const targetEditor = await response.text()
        console.log('>>>>> targetEditor:', targetEditor)
        this.setState({targetEditor})
    }

    setFlashMode = mode => {
        this.setState({flashMode: mode})
    }

    setQuality = value => {
        this.setState({quality: value})
    }

    setDesiredWidth = value => {
        this.setState({desiredWidth: parseInt(value, 10)})
    }

    takeAndConfirmPhoto = async () => {
        const {navigator, url} = this.props
        const {quality, desiredWidth} = this.state
        const {base64, uri, width, height} = await this.camera.takePictureAsync({
            quality,
            width: desiredWidth,
            base64: true,
        })
        const dataUrl = `data:image/jpeg;base64,${base64}`
        navigator.push({
            screen: 'AtomCodeAnnotations.ConfirmScreen',
            title: 'Confirm',
            passProps: {
                image: {
                    dataUrl,
                    uri,
                    width,
                    height,
                },
                server: {url},
            }
        })
    }
}
