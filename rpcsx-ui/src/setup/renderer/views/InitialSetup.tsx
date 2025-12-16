import React from 'react';
import { View, Text, Button } from 'react-native';
import * as bridge from '$core/bridge';

export default function InitialSetup() {
  const finish = async () => {
    await bridge.invoke('storage.set', {
      key: 'initialized',
      value: true,
    });

    bridge.viewSet('Explorer', {});
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 22 }}>Welcome to RPCSX</Text>
      <Button title="Continue" onPress={finish} />
    </View>
  );
}
