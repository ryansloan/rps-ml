// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "@babel/polyfill";
import * as mobilenetModule from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

// Number of classes to classify
const NUM_CLASSES = 3;
// Webcam Image size. Must be 227. 
const IMAGE_SIZE = 227;
// K value for KNN
const TOPK = 10;
const CLASS_NAMES=["rock","paper","scissors"]
let predicted = null;

class Main {
  constructor() {
    // Initiate variables
    this.infoTexts = [];
    this.classPredictor = null;
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;

    // Initiate deeplearn.js math and knn classifier objects
    this.bindPage();

    // Create video element that will contain the webcam image
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('playsinline', '');

    // Add video element to DOM
    document.body.appendChild(this.video);
    let instructions = document.createElement("div");
    instructions.innerText="click each 'train' button to train the computer on one frame from your camera";
    document.body.appendChild(instructions);

    // Create training buttons and info texts    
    for (let i = 0; i < NUM_CLASSES; i++) {
      const div = document.createElement('div');
      document.body.appendChild(div);
      div.style.marginBottom = '10px';

      // Create training button
      const button = document.createElement('button')
      button.innerText = "Train " + CLASS_NAMES[i];
      div.appendChild(button);

      // Listen for mouse events when clicking the button
      button.addEventListener('mousedown', () => this.training = i);
      button.addEventListener('mouseup', () => this.training = -1);

            button.addEventListener('touchstart', () => this.training = i);
      button.addEventListener('touchend', () => this.training = -1);

      // Create info text
      const infoText = document.createElement('span')
      infoText.innerText = " No examples added";
      div.appendChild(infoText);
      this.infoTexts.push(infoText);

    }
      //Create class prediction headline
      this.classPredictor = document.createElement('span');
      this.classPredictor.style.position="absolute";
      this.classPredictor.style.left="300px";
      this.classPredictor.style.top="80px";
      document.body.appendChild(this.classPredictor);
      //Create PLAY button
      this.playBtn = document.createElement('button');
      this.playBtn.style.position="absolute";
      this.playBtn.style.left="300px";
      this.playBtn.style.top="100px";
      this.playBtn.style.width="80px";
      this.playBtn.style.height="40px";
      this.playBtn.innerText="PLAY ROUND";
      this.playBtn.addEventListener('click', doPredict );
      document.body.appendChild(this.playBtn);


    // Setup webcam
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        this.video.srcObject = stream;
        this.video.width = IMAGE_SIZE;
        this.video.height = IMAGE_SIZE;

        this.video.addEventListener('playing', () => this.videoPlaying = true);
        this.video.addEventListener('paused', () => this.videoPlaying = false);
      })
  }

  async bindPage() {
    this.knn = knnClassifier.create();
    this.mobilenet = await mobilenetModule.load();

    this.start();
  }

  start() {
    if (this.timer) {
      this.stop();
    }
    this.video.play();
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    this.video.pause();
    cancelAnimationFrame(this.timer);
  }

  async animate() {
    if (this.videoPlaying) {
      // Get image data from video element
      const image = tf.fromPixels(this.video);

      let logits;
      // 'conv_preds' is the logits activation of MobileNet.
      const infer = () => this.mobilenet.infer(image, 'conv_preds');

      // Train class if one of the buttons is held down
      if (this.training != -1) {
        logits = infer();

        // Add current image to classifier
        this.knn.addExample(logits, this.training)
      }

      const numClasses = this.knn.getNumClasses();
      if (numClasses > 0) {

        // If classes have been added run predict
        logits = infer();
        const res = await this.knn.predictClass(logits, TOPK);

        for (let i = 0; i < NUM_CLASSES; i++) {

          // The number of examples for each class
          const exampleCount = this.knn.getClassExampleCount();

          // Make the predicted class bold
          if (res.classIndex == i) {
            this.infoTexts[i].style.fontWeight = 'bold';
          } else {
            this.infoTexts[i].style.fontWeight = 'normal';
          }

          // Update info text
          if (exampleCount[i] > 0) {
            this.infoTexts[i].innerText = ` ${exampleCount[i]} examples - ${res.confidences[i] * 100}%`
          }
        }
        //this.classPredictor.innerHTML="You say...<strong>"+CLASS_NAMES[res.classIndex]+"</strong>";
        predicted=CLASS_NAMES[res.classIndex];
      }

      // Dispose image when done
      image.dispose();
      if (logits != null) {
        logits.dispose();
      }
    }
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }
}
function doPredict() {
  console.log("do prediction and round");
  let win=0;
  let computer_choice = CLASS_NAMES[Math.floor(Math.random()*3)];
  console.log("computer chose "+computer_choice);
  if (predicted==="paper" && computer_choice == "scissors") {
    win=-1;
  }
  if (predicted==="paper" && computer_choice == "rock") {
    win=1;
  }
  if (predicted==="paper" && computer_choice == "paper") {
    win=0;
  }
  if (predicted==="rock" && computer_choice == "scissors") {
    win=1;
  }
  if (predicted==="rock" && computer_choice == "paper") {
    win=-1;
  }
  if (predicted==="rock" && computer_choice == "rock") {
    win=0;
  }
  if (predicted==="scissors" && computer_choice == "rock") {
    win=-1;
  }
  if (predicted==="scissors" && computer_choice == "paper") {
    win=1;
  }
  if (predicted==="scissors" && computer_choice == "scissors") {
    win=0;
  }
  console.log(win);
  alert("You played..."+predicted+"\n Computer played "+computer_choice+"\n"+(win>0 ? "YOU WIN" : win==0 ? "DRAW" : "YOU LOSE"));

}
window.addEventListener('load', () => new Main());