var dialogs = require("tns-core-modules/ui/dialogs");
var bluetooth = require("nativescript-bluetooth");

function pageLoaded(args) {
    var page = args.object;

    // the Observable-wrapped objects from the previous page
    var peripheral = page.navigationContext.peripheral;
    var service = page.navigationContext.service;
    service.peripheral = peripheral;
    page.bindingContext = service;
}

function onCharacteristicTap(args) {
  var index = args.index;
  var page = args.object;
  var service = page.bindingContext;
  var characteristic = service.characteristics[index];

  // show an actionsheet which contains the most relevant possible options
  var p = characteristic.properties;
  var actions = [];

  if (p.read) actions.push("read");
  if (p.write) actions.push("write");
  if (p.write) actions.push("write 0x01"); // convenience method, will write hex 1, translated to a binary 1
  if (p.writeWithoutResponse) actions.push("writeWithoutResponse");
  if (p.notify) actions.push("notify start");
  if (p.notify) actions.push("notify stop");

  dialogs.action({
    message: "Pick a property",
    cancelButtonText: "Cancel",
    actions: actions
  }).then(function (result) {
    function getTimestamp() {
      return new Date().toLocaleString();
    }

    if (result === "read") {
      bluetooth.read({
        peripheralUUID: service.peripheral.UUID,
        serviceUUID: service.UUID,
        characteristicUUID: characteristic.UUID
      }).then(function (result) {
        // result.value is an ArrayBuffer. Every service has a different encoding.
        // fi. a heartrate monitor value can be retrieved by:
        //var data = new Uint8Array(result.value);
        //   var heartRate = data[1];
        //let hex = data.from(uint8).toString('hex');
        var hex = buf2hex(result.value);
        var res = hex2a(hex);
        console.log(res);
        service.set("feedback", res)
        //service.set("feedback",result.value);
        service.set("feedbackRaw", hex);
        //service.set("feedbackRaw", result.valueRaw);
        service.set("feedbackTimestamp", getTimestamp());
      }, function(error) {
        service.set("feedback", error);
        service.set("feedbackTimestamp", getTimestamp());
      });
    } else if (result === "write") {
      dialogs.prompt({
        title: "Write what exactly?",
        message: "Please enter byte values; use 0x in front for hex and send multiple bytes by adding commas. For example 0x01 or 0x007F,0x006E",
        cancelButtonText: "Cancel",
        okButtonText: "Write it!"
      }).then(function(response) {
        if (response.result) {
          bluetooth.write({
            peripheralUUID: service.peripheral.UUID,
            serviceUUID: service.UUID,
            characteristicUUID: characteristic.UUID,
            value: response.text
          }).then(function (result) {
            service.set("feedback", 'value written');
            service.set("feedbackTimestamp", getTimestamp());
          },
          function (errorMsg) {
            service.set("feedback", errorMsg);
            service.set("feedbackTimestamp", getTimestamp());
          });
        }
      });
    } else if (result === "write 0x01") {
      bluetooth.write({
        peripheralUUID: service.peripheral.UUID,
        serviceUUID: service.UUID,
        characteristicUUID: characteristic.UUID,
        value: '0x01'
      }).then(function (result) {
        service.set("feedback", 'value written');
        service.set("feedbackTimestamp", getTimestamp());
      },
      function (errorMsg) {
        service.set("feedback", errorMsg);
        service.set("feedbackTimestamp", getTimestamp());
      });
    } else if (result === "writeWithoutResponse") {
      dialogs.prompt({
        title: "Write what exactly?",
        message: "Please enter byte values; use 0x in front for hex and send multiple bytes by adding commas. For example 0x01 or 0x007F,0x006E",
        cancelButtonText: "Cancel",
        okButtonText: "Write it!"
      }).then(function(response) {
        if (response.result) {
          bluetooth.writeWithoutResponse({
            peripheralUUID: service.peripheral.UUID,
            serviceUUID: service.UUID,
            characteristicUUID: characteristic.UUID,
            value: response.text
          }).then(function (result) {
            service.set("feedback", 'value write requested');
            service.set("feedbackTimestamp", getTimestamp());
          });
        }
      });
    } else if (result === "notify start") {
      bluetooth.startNotifying({
        peripheralUUID: service.peripheral.UUID,
        serviceUUID: service.UUID,
        characteristicUUID: characteristic.UUID,
        onNotify: function(result) {
          // result.value is an ArrayBuffer. Every service has a different encoding.
          // fi. a heartrate monitor value can be retrieved by:
          //   var data = new Uint8Array(result.value);
          //   var heartRate = data[1];
          service.set("feedback", result.value);
          service.set("feedbackRaw", result.valueRaw);
          service.set("feedbackTimestamp", getTimestamp());
        }
      }).then(function (result) {
        service.set("feedback", 'subscribed for notifications');
        service.set("feedbackTimestamp", getTimestamp());
      });
    } else if (result === "notify stop") {
      bluetooth.stopNotifying({
        peripheralUUID: service.peripheral.UUID,
        serviceUUID: service.UUID,
        characteristicUUID: characteristic.UUID
      }).then(function (result) {
        service.set("feedback", 'notification stopped');
        service.set("feedbackTimestamp", getTimestamp());
      }, function(error) {
        service.set("feedback", error);
      });
    }
  });
}

function buf2hex(buffer) { // buffer is an ArrayBuffer
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

exports.pageLoaded = pageLoaded;
exports.onCharacteristicTap = onCharacteristicTap;
