import { StyleSheet } from 'react-native';

export type StylesParams = {
  width?: number;
  onSurface: string;
  outline: string;
  primary: string;
  onPrimary: string;
};

export const Styles = ({
  width = '100%' as unknown as number,
  onSurface,
  outline,
  primary,
  onPrimary,
}: StylesParams) =>
  StyleSheet.create({
    /** Layout */
    page: {
      width,
      padding: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },

    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },


    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    /** Text */
    title: {
      color: onSurface,
      fontSize: 20,
      fontWeight: '500',
      textAlign: 'center',
    },

    description: {
      color: '#aaa',
      textAlign: 'center',
    },

    brand: {
      color: onSurface,
      fontSize: 32,
      fontWeight: '600',
      marginLeft: 12,
    },

    actions: {
      marginTop: 24,
      width: '100%',
    },

    /** Buttons */
    primaryButton: {
      backgroundColor: primary,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
    },

    primaryText: {
      color: onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },

    secondaryButton: {
      borderWidth: 1,
      borderColor: outline,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
    },

    secondaryText: {
      color: onSurface,
      fontSize: 16,
    },

    /** Inputs */
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: outline,
      borderRadius: 12,
      padding: 14,
      color: onSurface,
    },

    /** Utilities */
    qrBox: {
      borderWidth: 2,
      borderColor: outline,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
    },

    qrText: {
      color: '#666',
      fontSize: 24,
    },

    mt24: { marginTop: 24 },
    mb4: { marginBottom: 4 },
    mb12: { marginBottom: 12 },
    center: { alignItems: 'center', justifyContent: 'center' },
  });
