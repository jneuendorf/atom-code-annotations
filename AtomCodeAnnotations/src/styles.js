import {StyleSheet} from 'react-native'


export const rawStyles = {
    section: {
        padding: 20,
    },
    red: 'rgb(255,59,48)',
}

export default StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        ...rawStyles.section,
        borderBottomColor: '#bbb',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    sectionNoBorder: {
        ...rawStyles.section,
    },
    row: {
        flexDirection: 'row',
    },
    rowItem: {
        marginRight: 15,
    },
    centeredSpaced: {
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    bold: {
        fontWeight: 'bold',
    },
    icon: {
        height: 25,
        width: 25,
    },
    headline: {
        fontSize: 20,
        marginBottom: 14,
    },
    text: {
        fontSize: 16,
    },
    blue: {
        color: 'rgb(0,122,255)',
    },
    spacer: {
        height: 10,
        width: 10,
    },
})
