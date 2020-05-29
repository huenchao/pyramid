const EventEmitter = require('events');
const Kafka = require('node-rdkafka');

/**
 * 
 *  worker broadcasts others {type:"cgsc",data:new_schedule_configs}
 * 
 * */

module.exports = class Mq extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.last = '';
    this.topicName = 'screenshoot-info';
    this.pBaseConfig = {
      'metadata.broker.list': '172.22.75.181:9092,172.22.75.156:9092,172.22.75.244:9092,172.22.75.191:9092',
      'sasl.username': 'user8776',
      'sasl.password': 'VdQSmjg0VscV6teK',
      'sasl.mechanisms': 'SCRAM-SHA-256',
      'security.protocol': 'sasl_plaintext',
      dr_cb: true,
    }
    this.cBaseConfig = {
    //  'debug':'all',
      'group.id': 'handsOfDavinciConsumerGroup',
      'metadata.broker.list': '172.22.75.181:9092,172.22.75.156:9092,172.22.75.244:9092,172.22.75.191:9092',
      'sasl.username':'user8777',
      'sasl.password': 'b4nhhSGnmav4OeO9',
      'sasl.mechanisms': 'SCRAM-SHA-256',
      'security.protocol': 'sasl_plaintext',
      'enable.auto.commit': false
    }
    if(process.env.EGG_SERVER_ENV === 'prod'){
      this.pBaseConfig = {
        'metadata.broker.list': '172.20.249.96:9092,172.20.249.91:9092,172.20.249.95:9092,172.20.249.97:9092',
        'security.protocol': 'sasl_plaintext',
        'sasl.username': 'user13584',
        'sasl.password': 'YyIiEsnOVkxtwcBW',
        'sasl.mechanisms': 'SCRAM-SHA-256',
        dr_cb: true,
      };
      this.cBaseConfig = {
        'group.id': 'handsOfDavinciConsumerGroup',
        'metadata.broker.list': '172.20.249.96:9092,172.20.249.91:9092,172.20.249.95:9092,172.20.249.97:9092',
        'sasl.username': 'user13586',
        'sasl.password': 'oxy1WQ7PCbSyaUqY',
        'sasl.mechanisms': 'SCRAM-SHA-256',
        'security.protocol': 'sasl_plaintext',
        'enable.auto.commit': false
      }
    }
    this.initialProducer();
    this.initialConsumer();
  }
  _write(_data_str){
    if(this.timer){
      clearInterval(this.timer)
    }
    this.timer = setInterval(()=>{
       this._producerInstance.produce(this.topicName, -1,  Buffer.from(_data_str), null, Date.now())
    },2000)
  }

  _read(_data_str) {
    this.emit("msg_config",_data_str);
  }

  initialProducer(){
    this._producerInstance = new Kafka.Producer(this.pBaseConfig);
    if (!this._producerInstance.isConnected()) {
      this._producerInstance.connect({ topic: this.topicName, timeout: 5000 }, (err, data) => {
        if (err) {
          console.log('connect err ', err);
        }
        if (data) {
          console.log('connect data ', data);
        }
      });
    }
    this._producerInstance.on('event.error', err => {
      console.error('Error from producer');
      console.error(err);
    });
    this._producerInstance.on('event.log', function(log) {
      console.log('event.log:', log);
    });
    this._producerInstance.on('delivery-report', function(err, report) {
      if (err) {
        console.error('delivery-report err', err.stack);
      } else {
        console.log('delivery-report: ' + JSON.stringify(report));
      }
    });
    this._producerInstance.on('disconnected', arg => {
      console.log('producer disconnected. ' + JSON.stringify(arg));
      this.initialProducer();
    });
    this._producerInstance.on('ready', arg => {
      console.log('producer ready.' + JSON.stringify(arg));
    });
    this._producerInstance.setPollInterval(100); // 100ms
  }
  
  initialConsumer(){
    this._consumerInstance = new Kafka.KafkaConsumer(this.cBaseConfig);
    if (!this._consumerInstance.isConnected()) {
      this._consumerInstance.connect();
    }
    this._consumerInstance.on('ready', arg => {
      console.log('consuming ready.' + JSON.stringify(arg));
      this._consumerInstance.subscribe([this.topicName]);
      //start consuming messages
      this._consumerInstance.consume();
    });
    //logging debug messages, if debug is enabled
    this._consumerInstance.on('event.log', function(log) {
      console.log(log);
    });

    //logging all errors
    this._consumerInstance.on('event.error', function(err) {
    console.error('Error from consumer');
    console.error(err);
    });
    this._consumerInstance.on('disconnected', function(arg) {
      console.log('consumer disconnected. ' + JSON.stringify(arg));
      this.initialConsumer()
    });
    this._consumerInstance.on('data', (m)=> {
      if(this.timer){
        clearInterval(this.timer);
        this.timer = null;
      }
      const cur = m.value.toString();
      if(!this.last){
        this.last = cur;
        this._read(this.last);
      }else{
        if(this.last !== cur){
          this.last = cur;
          this._read(cur);
        }
      }
    });
  }
};