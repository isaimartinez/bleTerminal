import { NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';
import BleManager from 'react-native-ble-manager'
import {store} from '../redux/store'
import {setIsInit, setIsScanning, setDevices, addDevice, setIsConnected, addHistory} from '../redux/bleSlice';
import { stringToBytes, bytesToString } from "convert-string";


const BleManagerModule = NativeModules.BleManager
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule)


export const initBle = () => {
  BleManager.start({ showAlert: true })

  bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
  bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
  bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
  bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );

  if (Platform.OS === 'android' && Platform.Version >= 23) {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
        if (result) {
          console.log("Permission is OK");
        } else {
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
            if (result) {
              console.log("User accept");
            } else {
              console.log("User refuse");
            }
          });
        }
    });
  }  
  store.dispatch(setIsInit(true))
  console.log("Ble initialized")
}

export const unmountBle = () => {
  bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
  bleManagerEmitter.removeAllListeners('BleManagerStopScan', handleStopScan );
  bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
  bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
  console.log('unmount');
  store.dispatch(setIsInit(false))
}


const handleDiscoverPeripheral = (peripheral) => {
  if (peripheral.name) {
    store.dispatch(addDevice(peripheral))
  }
  // peripherals.set(peripheral.id, peripheral);
  // setList(Array.from(peripherals.values()));
}

const handleStopScan = () => {
  store.dispatch(setIsScanning(false))
}

const handleDisconnectedPeripheral = (data) => {
  console.log('Disconnected from ' + data.peripheral);
  store.dispatch(setIsConnected(false))
}

const handleUpdateValueForCharacteristic = (data) => {
  console.log('Received data from ', data.value);
  if(data.value) {
    let response = bytesToString(data.value);
    console.log('Received response', response);
    store.dispatch(addHistory({data: response, type: 2}))
  } else {
    console.log('Received response', 'NULL');
    store.dispatch(addHistory({data: 'NULL', type: 2}))

  }
}

export const scan = () => {
  store.dispatch(setDevices([]))
  BleManager.scan([], 2, false).then(() => {
    store.dispatch(setIsScanning(true))
  }).catch(err => {
    console.error(err);
  });
}

export const connectAndPrepare = async (id) => {
  console.log("connectAndPrepare")
  await BleManager.connect(id)
  BleManager.retrieveServices(id).then((info) => {
    let service = info.characteristics[0].service
    let characteristic = info.characteristics[0].characteristic
    let uuids = {service, characteristic}
    store.dispatch(setIsConnected(uuids))

    setTimeout(() => {
      BleManager.startNotification(id, service, characteristic).then(() => {
        console.log('Started notification on ' + id);
      }).catch((error) => {
        console.log('Notification error', error);
      });
    }, 200);




  })
}

export const disconnect = async (id) => {
  BleManager.disconnect(id).then(() => {
    console.log("Disconnecting");
  })
  .catch((error) => {
    console.log(error);
  });
}

export const write = async (id, service,characteristic, val) => {
  let write = stringToBytes(val)
  BleManager.write(id,service,characteristic,write).then(() => {
    store.dispatch(addHistory({data: val, type: 3}))
    console.log("Writed: " + write);

    // read(id, service,characteristic)

  }).catch((error) => {
    console.log(error);
  });
}

export const read = async (id, service,characteristic,) => {
  BleManager.read(id,service,characteristic).then((recived) => {
    console.log("Recived: " + recived);
    let response = bytesToString(recived);
    console.log("Readed: ", + response)
    store.dispatch(addHistory({data: response, type: 2}))
  }).catch((error) => {
      console.log("Error: ", error)
  });  
}