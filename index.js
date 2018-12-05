var http = require('http');
var request = require("request");
var pollingtoevent = require('polling-to-event');
var fs = require('fs');
var Accessory, Service, Characteristic, UUIDGen, PlatformAccessory;

module.exports = function(homebridge) {
	if(!isConfig(homebridge.user.configPath(), "platforms", "ZontPlatform")) {
        return;
    }
	Accessory = homebridge.hap.Accessory;
	PlatformAccessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	UUIDGen = homebridge.hap.uuid;
	homebridge.registerPlatform("homebridge-zont-platform", "ZontPlatform", ZontPlatform, true);
}

function ZontPlatform(log, config, api) {
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessories = [];
  this.gatewaySids = {};
  this.lastGatewayUpdateTime = {};
  this.lastDeviceUpdateTime = {};
  this.username = config['username'];
  this.password = config['password'];
  this.log("Zont Platform Init");

  if (api) {

      this.api = api;

      this.api.on('didFinishLaunching', function() {
        platform.log("DidFinishLaunching");
      }.bind(this));
  }

  setInterval(updateZont,2000,this);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if("accessories" === type) {
        var accessories = config.accessories;
        for(var i in accessories) {
            if(accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if("platforms" === type) {
        var platforms = config.platforms;
        for(var i in platforms) {
            if(platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }
    
    return false;
}

ZontPlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;
  var that = this;
  accessory.reachable = true;
  accessory.on('identify', function(paired, callback) {
    that.log(accessory.displayName, "Identify!!!");
    callback();
  });

  this.accessories.push(accessory);
  this.lastDeviceUpdateTime[accessory.UUID] = Date.now();
}

function updateZont (noThis)
{
	request.post({
		url: 'https://zont-online.ru/api/devices',
		headers: {'X-ZONT-Client': 'sprut.1@me.com'},
		form: {'load_io': true},
		auth: {
			'user': noThis.username,
			'pass': noThis.password
		}
	},function(err, response, body)
	{
			 if (!err && response.statusCode == 200)
			 {
					var state = JSON.parse(body);
					noThis.addDevices(state["devices"], noThis);

			 }else{
				 console.log(' ERROR ');
				 console.log(' ERROR REQUEST RESULTS:', err, body);
			 }
	}.bind(noThis));
}

ZontPlatform.prototype.addDevices = function(devices, noThis)
{
	for (var index in devices)
	{
		if (devices[index]["device_type"]["code"] == "ZTC-720")
		{
			var deviceCode = "Сигналка 720"
			var deviceSid = devices[index]["id"];
		    var gatewaySid = this.username;

			if (!this.lastGatewayUpdateTime[gatewaySid] || this.lastGatewayUpdateTime[gatewaySid] < devices[0]["last_receive_time"])
			{

				this.lastGatewayUpdateTime[gatewaySid] = devices[0]["last_receive_time"];
				var c1State = (devices[0]["io"]["guard-state"] == "disabled") ?   false: true;
				if (devices[0]["io"]["auto-ignition"])
				{
					var cState = (devices[0]["io"]["auto-ignition"]["state"] == "disabled") ?   false: true;
					this.setSwitch(deviceCode + "Автозапуск",gatewaySid, deviceSid,'auto-ignition' + deviceSid, cState,"auto-ignition", "auto-ignition", 'enabled', 'disabled', noThis);
				}
			    this.setSwitch(deviceCode + "Охрана",gatewaySid, deviceSid,'guard-state' + deviceSid, c1State,"guard-state", "string", 'enabled', 'disabled', noThis);
			    this.setSwitch(deviceCode + "Сирена",gatewaySid, deviceSid,'siren' + deviceSid, devices[0]["io"]["siren"],"siren", "bool" ,true , false, noThis);
				this.setSwitch(deviceCode + "Блокировка",gatewaySid, deviceSid,'engine-block' + deviceSid, devices[0]["io"]["engine-block"],"engine-block", "bool" ,true, false, noThis);
				this.setMotion(deviceCode + "Зажигание",gatewaySid, deviceSid,'ignition-state' + deviceSid, devices[0]["io"]["ignition-state"]);
				this.setMotion(deviceCode + "Двигатель",gatewaySid, deviceSid,'engine-state' + deviceSid, devices[0]["io"]["engine-state"]);
				this.setMotion(deviceCode + "Двери",gatewaySid, deviceSid,'doors' + deviceSid, devices[0]["io"]["doors"]);
				this.setDoors(deviceCode + "1 двер", gatewaySid, deviceSid,'door-1' + deviceSid, devices[0]["io"]["door-1"])
				this.setDoors(deviceCode + "2 двер", gatewaySid, deviceSid,'door-2' + deviceSid, devices[0]["io"]["door-2"])
				this.setDoors(deviceCode + "3 двер", gatewaySid, deviceSid,'door-3' + deviceSid, devices[0]["io"]["door-3"])
				this.setDoors(deviceCode + "4 двер", gatewaySid, deviceSid,'door-4' + deviceSid, devices[0]["io"]["door-4"])
				this.setMotion(deviceCode + "Капот",gatewaySid, deviceSid,'hood' + deviceSid, devices[0]["io"]["hood"]);
				this.setMotion(deviceCode + "Багажник",gatewaySid, deviceSid,'trunk' + deviceSid, devices[0]["io"]["trunk"]);
				this.setMotion(deviceCode + "Диагностика",gatewaySid, deviceSid,'ecu-diagnostics-active' + deviceSid, devices[0]["io"]["ecu-diagnostics-active"]);
				this.setMotion(deviceCode + "Тревога",gatewaySid, deviceSid,'shock' + deviceSid, devices[0]["io"]["shock"]);
				this.setMotion(deviceCode + "Нет свзи",gatewaySid, deviceSid,'online' + deviceSid, !devices[0]["online"]);
				
				var custom_controls = devices[0]["custom_controls"];

for (var control_no = 0; control_no < custom_controls.length; control_no++)
{
    //console.log('control', control_no);
    var control = custom_controls[control_no];
    var commands = control['commands'];
    var statuses = control['statuses'];


    if (commands != null)
    {
        for (var i = 0; i < commands.length; i++)
        {
            var command = commands[i];
            //console.log('  command', command['id'], command['name']);
            this.setCustomSwitch(deviceCode + command['name'], gatewaySid, deviceSid, command['name'] + deviceSid, command['id'], noThis);
        }
    }

    if (statuses != null)
    {
        for (var i = 0; i < statuses.length; i++)
        {
            var status = statuses[i];
        }
    }
}


                var tempValue = JSON.parse(JSON.stringify(devices[0]["io"]["temperature"]));
                var AmountTempValue = JSON.parse(JSON.stringify(devices[0]["temperature_conf"]["assignments"]));

                for (var value in AmountTempValue) {
                	if (tempValue[value].state == "ok"){
                		currentState = tempValue[value].value
                		lastState = currentState
                		if (currentState != lastState){
                			newState = currentState
                            this.setTermperature(deviceCode + AmountTempValue[value], gatewaySid, deviceSid,AmountTempValue[value] + deviceSid, newState)
                        }
                    }
                }
            }
        }
    }
}

ZontPlatform.prototype.setSwitch = function(name,gatewaySid, deviceSid,subDeviceSid, State, portname, type, CommandOn, CommandOff, noThis)
{            
    this.findServiceAndSetValue(
    name,
    gatewaySid,
    deviceSid,
    UUIDGen.generate(subDeviceSid),
    Accessory.Categories.SWITCH,
    Service.Switch,
    Characteristic.On,
    State,
    portname, type, CommandOn, CommandOff, noThis);
}

ZontPlatform.prototype.setCustomSwitch = function(name,gatewaySid, deviceSid,subDeviceSid, command_id, noThis)
{            
    this.findServiceAndSetValue2(
    name,
    gatewaySid,
    deviceSid,
    UUIDGen.generate(subDeviceSid),
    Accessory.Categories.SWITCH,
    Service.Switch,
    Characteristic.On,
    command_id,
    noThis);
}

ZontPlatform.prototype.setMotion = function(name,gatewaySid, deviceSid,subDeviceSid, State)
{
    this.findServiceAndSetValue(
    name,
    gatewaySid,
    deviceSid,
    UUIDGen.generate(subDeviceSid),
    Accessory.Categories.SENSOR,
    Service.MotionSensor,
    Characteristic.MotionDetected,
    State,
    null,null,null,null);
}

ZontPlatform.prototype.setDoors = function(name,gatewaySid, deviceSid, subDeviceSid, State)
{
    this.findServiceAndSetValue(
    name,
    gatewaySid,
    deviceSid,
    UUIDGen.generate(subDeviceSid),
    Accessory.Categories.SENSOR,
    Service.ContactSensor,
    Characteristic.ContactSensorState,
    State,
    null,null,null,null);
}

ZontPlatform.prototype.setTermperature = function(name,gatewaySid, deviceSid,subDeviceSid, State)
{
    this.findServiceAndSetValue(
    name,
    gatewaySid,
    deviceSid,
    UUIDGen.generate(subDeviceSid),
    Accessory.Categories.SENSOR,
    Service.TemperatureSensor,
    Characteristic.CurrentTemperature,
    State,
    null,null,null,null);
}

ZontPlatform.prototype.getAccessoryModel = function(type) {
  switch (type) {
    case Service.Lightbulb:
      return "Light Switch";
    case Service.Switch:
      return "Switch";
    case Service.Outlet:
      return "Plug Switch";
    case Service.TemperatureSensor:
      return "Temperature Sensor";
    case Service.HumiditySensor:
      return "Humidity Sensor";
    case Service.ContactSensor:
      return "Contact Sensor";
    case Service.MotionSensor:
      return "Motion Sensor";
    case Service.StatelessProgrammableSwitch:
      return "Prog Button";
    default:
      return "Unknown";
  }
}

function setState(device, portname, type, state, noThis)
{
	request.post({
		url: 'https://zont-online.ru/api/set_io_port',
		headers: {'X-ZONT-Client': 'sprut.1@me.com'},
		json: {device_id: device,
				portname: portname,
				type: type,
				value: (type == "auto-ignition") ? {state: state} : state },
		auth: {
			'user': noThis.username,
			'pass': noThis.password
		}
	},function(err, response, body) {
			 if (!err && response.statusCode == 200) {
			 }else{
				 console.log(' ERROR REQUEST RESULTS:', err, response.statusCode, body);
			 }
	}.bind(this));
}

function sendCustomCommand(device, command_id, on, off, noThis)
{
	request.post({
    url: 'https://zont-online.ru/api/send_custom_command',
    headers: {'X-ZONT-Client': 'sprut.1@me.com'},
    json: {
        device_id: device,
        command_id: command_id
    },
    auth: {
        user: noThis.username,
        pass: noThis.password
    }
	},function(err, response, body) {
			 if (!err && response.statusCode == 200) {
			 }else{
				 console.log(' ERROR REQUEST RESULTS:', err, response.statusCode, body);
			 }
	}.bind(this));
}

ZontPlatform.prototype.findServiceAndSetValue = function(
  accessoryName,gatewaySid, deviceSid,
  accessoryUUID,accessoryCategory,
  serviceType,
  characteristicType, characteristicValue,
  portname, type, CommandOn, CommandOff, noThis) {

  var serviceName = accessoryName;  
  this.gatewaySids[accessoryUUID] = gatewaySid;
  var that = this;
  var newAccessory = null;
  var service = null;

  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    if (accessory.UUID === accessoryUUID) {
      newAccessory = accessory;
    }
  }

  if (!newAccessory) {
    newAccessory = new PlatformAccessory(accessoryName, accessoryUUID, accessoryCategory);
    newAccessory.reachable = true;

    newAccessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Zont")
    .setCharacteristic(Characteristic.Model, this.getAccessoryModel(serviceType))
    .setCharacteristic(Characteristic.SerialNumber, ""+deviceSid);

    service = newAccessory.addService(serviceType, serviceName);
    this.api.registerPlatformAccessories("homebridge-ZontPlatform", "ZontPlatform", [newAccessory]);
    newAccessory.on('identify', function(paired, callback) {
      that.log(newAccessory.displayName, "Identify!!!");
      callback();
    });

    this.accessories.push(newAccessory);
  } else {
    service = newAccessory.getService(serviceType);
  }

  if (!service) {
    service = newAccessory.addService(serviceType, serviceName);
  }

  var characteristic = service.getCharacteristic(characteristicType);

  if (characteristic) {

    characteristic.updateValue(characteristicValue);

   if (portname && (characteristic.listeners('set').length == 0)) {
     characteristic.on("set", function(value, callback)
		 {
		  var newVelue = (value == 1) ? CommandOn : CommandOff;
          setState(deviceSid, portname, type, newVelue, noThis);
          callback();
     });
   }
  } else {
    that.log("Service not found");
  }
}

ZontPlatform.prototype.findServiceAndSetValue2 = function(
  accessoryName,gatewaySid, deviceSid,
  accessoryUUID,accessoryCategory,
  serviceType,
  characteristicType, characteristicValue,
  noThis) {

  var serviceName = accessoryName;  
  this.gatewaySids[accessoryUUID] = gatewaySid;
  var that = this;
  var newAccessory = null;
  var service = null;
  var portname = 0;

  for (var index in this.accessories) {
    var accessory = this.accessories[index];
    if (accessory.UUID === accessoryUUID) {
      newAccessory = accessory;
    }
  }

  if (!newAccessory) {
    newAccessory = new PlatformAccessory(accessoryName, accessoryUUID, accessoryCategory);
    newAccessory.reachable = true;

    newAccessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Zont")
    .setCharacteristic(Characteristic.Model, this.getAccessoryModel(serviceType))
    .setCharacteristic(Characteristic.SerialNumber, ""+deviceSid);

    service = newAccessory.addService(serviceType, serviceName);
    this.api.registerPlatformAccessories("homebridge-ZontPlatform", "ZontPlatform", [newAccessory]);
    newAccessory.on('identify', function(paired, callback) {
      that.log(newAccessory.displayName, "Identify!!!");
      callback();
    });

    this.accessories.push(newAccessory);
  } else {
    service = newAccessory.getService(serviceType);
  }

  if (!service) {
    service = newAccessory.addService(serviceType, serviceName);
  }

  var characteristic = service.getCharacteristic(characteristicType);

  if (characteristic) {

    characteristic.updateValue(characteristicValue);

   if (characteristic.listeners('set').length == 0) {
     characteristic.on("set", function(value, callback)
		 {
          sendCustomCommand(deviceSid, characteristicValue, noThis, noThis, noThis);
          callback();
     });
   }
  } else {
    that.log("Service not found");
  }
}

ZontPlatform.prototype.removeAccessory = function() {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("homebridge-ZontPlatform", "ZontPlatform", this.accessories);
  this.accessories = [];
}
