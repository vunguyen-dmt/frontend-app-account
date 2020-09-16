import React from 'react';
import PropTypes from 'prop-types';
import * as blazeface from '@tensorflow-models/blazeface';
import CameraPhoto, { FACING_MODES } from 'jslib-html5-camera-photo';
import { injectIntl, intlShape } from '@edx/frontend-platform/i18n';
import { Form, Spinner } from '@edx/paragon';

import shutter from './data/camera-shutter.base64.json';
import messages from './IdVerification.messages';

class Camera extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.cameraPhoto = null;
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.setDetection = this.setDetection.bind(this);
    this.state = {
      dataUri: '',
      videoHasLoaded: false,
      shouldDetect: false,
      isFinishedLoadingDetection: true,
      shouldGiveFeedback: true,
      feedback: '',
    };
  }

  componentDidMount() {
    this.cameraPhoto = new CameraPhoto(this.videoRef.current);
    this.cameraPhoto.startCamera(
      this.props.isPortrait ? FACING_MODES.USER : FACING_MODES.ENVIRONMENT,
      { width: 640, height: 480 },
    );
  }

  async componentWillUnmount() {
    this.cameraPhoto.stopCamera();
  }

  setDetection() {
    this.setState(
      { shouldDetect: !this.state.shouldDetect },
      () => {
        if (this.state.shouldDetect) {
          this.setState({ isFinishedLoadingDetection: false });
          this.startDetection();
        }
      },
    );
  }

  startDetection() {
    setTimeout(() => {
      if (this.state.videoHasLoaded) {
        const loadModelPromise = blazeface.load();
        Promise.all([loadModelPromise])
          .then((values) => {
            this.setState({ isFinishedLoadingDetection: true });
            this.detectFromVideoFrame(values[0], this.videoRef.current);
          });
      } else {
        this.setState({ isFinishedLoadingDetection: true });
        this.setState({ shouldDetect: false });
        // TODO: add error message
      }
    }, 1000);
  }

  detectFromVideoFrame = (model, video) => {
    model.estimateFaces(video).then((predictions) => {
      if (this.state.shouldDetect && !this.state.dataUri) {
        this.showDetections(predictions);

        requestAnimationFrame(() => {
          this.detectFromVideoFrame(model, video);
        });
      }
    });
  };

  showDetections = (predictions) => {
    let canvasContext;
    if (predictions.length > 0) {
      canvasContext = this.canvasRef.current.getContext('2d');
      canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
    }
    // predictions is an array of objects describing each detected face
    predictions.forEach((prediction) => {
      const start = [prediction.topLeft[0], prediction.topLeft[1]];
      const end = [prediction.bottomRight[0], prediction.bottomRight[1]];
      const size = [end[0] - start[0], end[1] - start[1]];

      // landmarks is an array of points representing each facial landmark (i.e. right eye, left eye, nose, etc.)
      const features = prediction.landmarks;
      let isInPosition = true;

      // for each of the landmarks, determine if it is in position
      for (let j = 0; j < features.length; j++) {
        const x = features[j][0];
        const y = features[j][1];

        let isInRange;
        if (this.props.isPortrait) {
          isInRange = this.isInRangeForPortrait(x, y);
        } else {
          isInRange = this.isInRangeForID(x, y);
        }
        // if it is not in range, give feedback depending on which feature is out of range
        isInPosition = isInPosition && isInRange;
      }

      // draw a box depending on if all landmarks are in position
      if (isInPosition) {
        canvasContext.strokeStyle = '#00ffff';
        canvasContext.lineWidth = 6;
        canvasContext.strokeRect(start[0], start[1], size[0], size[1]);
        // give positive feedback here if user is in correct position
        this.giveFeedback(predictions.length, [], true);
      } else {
        canvasContext.fillStyle = 'rgba(255, 51, 0, 0.75)';
        canvasContext.fillRect(start[0], start[1], size[0], size[1]);
        this.giveFeedback(predictions.length, features[0], false);
      }
    });

    if (predictions.length === 0) {
      this.giveFeedback(predictions.length, [], false);
    }
  }

  giveFeedback(numFaces, rightEye, isCorrect) {
    if (this.state.shouldGiveFeedback) {
      const currentFeedback = this.state.feedback;
      let newFeedback = '';
      if (numFaces === 1) {
        // only give feedback if one face is detected otherwise
        // it would be difficult to tell a user which face to move
        if (isCorrect) {
          newFeedback = this.props.intl.formatMessage(messages['id.verification.photo.feedback.correct']);
        } else {
          // give feedback based on where user is
          newFeedback = this.props.intl.formatMessage(messages[this.getGridPosition(rightEye)]);
        }
      } else if (numFaces > 1) {
        newFeedback = this.props.intl.formatMessage(messages['id.verification.photo.feedback.two.faces']);
      } else {
        newFeedback = this.props.intl.formatMessage(messages['id.verification.photo.feedback.no.faces']);
      }
      if (currentFeedback !== newFeedback) {
        // only update status if it is different, so we don't overload the user with status updates
        this.setState({ feedback: newFeedback });
      }
      // turn off feedback for one to ensure that instructions aren't disruptive/interrupting
      this.setState({ shouldGiveFeedback: false });
      setTimeout(() => {
        this.setState({ shouldGiveFeedback: true });
      }, 1000);
    }
  }

  getGridPosition(coordinates) {
    // Used to determine where a face is (i.e. top-left, center-right, bottom-center, etc.)

    const x = coordinates[0];
    const y = coordinates[1];

    let messageBase = 'id.verification.photo.feedback';

    const heightUpperLimit = 320;
    const heightMiddleLimit = 160;

    if (y < heightMiddleLimit) {
      messageBase += '.top';
    } else if (y < heightUpperLimit && y >= heightMiddleLimit) {
      messageBase += '.center';
    } else {
      messageBase += '.bottom';
    }

    const widthRightLimit = 213;
    const widthMiddleLimit = 427;

    if (x < widthRightLimit) {
      messageBase += '.right';
    } else if (x >= widthRightLimit && x < widthMiddleLimit) {
      messageBase += '.center';
    } else {
      messageBase += '.left';
    }

    return messageBase;
  }

  isInRangeForPortrait(x, y) {
    return x > 47 && x < 570 && y > 100 && y < 410;
  }

  isInRangeForID(x, y) {
    return x > 120 && x < 470 && y > 120 && y < 350;
  }

  setVideoHasLoaded() {
    this.setState({ videoHasLoaded: 'true' });
  }

  takePhoto() {
    if (this.state.dataUri) {
      return this.reset();
    }

    const config = {
      sizeFactor: this.getSizeFactor(),
    };

    this.playShutterClick();
    const dataUri = this.cameraPhoto.getDataUri(config);
    this.setState({ dataUri });
    this.props.onImageCapture(dataUri);
  }

  getSizeFactor() {
    let sizeFactor = 1;
    const settings = this.cameraPhoto.getCameraSettings();
    if (settings) {
      const videoWidth = settings.width;
      const videoHeight = settings.height;
      // need to multiply by 3 because each pixel contains 3 bytes
      const currentSize = videoWidth * videoHeight * 3;
      // chose a limit of 9,999,999 (bytes) so that result will
      // always be less than 10MB
      const ratio = 9999999 / currentSize;

      // if the current resolution creates an image larger than 10 MB, adjust sizeFactor (resolution)
      // to ensure that image will have a file size of less than 10 MB.
      if (ratio < 1) {
        sizeFactor = ratio;
      }
    }
    return sizeFactor;
  }

  playShutterClick() {
    const audio = new Audio(`data:audio/mp3;base64,${shutter.base64}`);
    audio.play();
  }

  reset() {
    this.setState({ dataUri: '' });
    if (this.state.shouldDetect) {
      this.startDetection();
    }
  }

  render() {
    const cameraFlashClass = this.state.dataUri
      ? 'do-transition camera-flash'
      : 'camera-flash';
    return (
      <div className="camera-outer-wrapper shadow">
        <Form.Group style={{ textAlign: 'left', padding: '0.5rem', marginBottom: '0.5rem' }} >
          <Form.Check
            id="videoDetection"
            name="videoDetection"
            label={this.props.intl.formatMessage(messages['id.verification.photo.enable.detection'])}
            aria-describedby="videoDetectionHelpText"
            checked={this.state.shouldDetect}
            onChange={this.setDetection}
            style={{ padding: '0rem', marginLeft: '1.25rem', float: this.state.isFinishedLoadingDetection ? 'none' : 'left' }}
          />
          {!this.state.isFinishedLoadingDetection && <Spinner animation="border" variant="primary" style={{ marginLeft: '0.5rem' }} data-testid="spinner" />}
          <Form.Text id="videoDetectionHelpText" data-testid="videoDetectionHelpText">
            {this.props.isPortrait
              ? this.props.intl.formatMessage(messages['id.verification.photo.enable.detection.portrait.help.text'])
              : this.props.intl.formatMessage(messages['id.verification.photo.enable.detection.id.help.text'])}
          </Form.Text>
        </Form.Group>
        <div className="camera-wrapper">
          <div className={cameraFlashClass} />
          <video
            ref={this.videoRef}
            data-testid="video"
            autoPlay
            className="camera-video"
            onLoadedData={() => { this.setVideoHasLoaded(); }}
            style={{
              display: this.state.dataUri ? 'none' : 'block',
              WebkitTransform: 'scaleX(-1)',
              transform: 'scaleX(-1)',
            }}
            playsInline
          />
          <canvas
            ref={this.canvasRef}
            data-testid="detection-canvas"
            className="canvas-video"
            style={{
              display: !this.state.shouldDetect || this.state.dataUri ? 'none' : 'block',
              WebkitTransform: 'scaleX(-1)',
              transform: 'scaleX(-1)',
            }}
            width="640"
            height="480"
          />
          <img
            alt="imgCamera"
            src={this.state.dataUri}
            className="camera-video"
            style={{ display: this.state.dataUri ? 'block' : 'none' }}
          />
          <div role="status" className="sr-only">{this.state.feedback}</div>
        </div>
        <button
          className={`btn camera-btn ${
            this.state.dataUri ?
              'btn-outline-primary'
              : 'btn-primary'
          }`}
          accessKey="c"
          onClick={() => {
            this.takePhoto();
          }}
        >
          {this.state.dataUri
            ? this.props.intl.formatMessage(messages['id.verification.photo.retake'])
            : this.props.intl.formatMessage(messages['id.verification.photo.take'])}
        </button>
      </div>
    );
  }
}

Camera.propTypes = {
  intl: intlShape.isRequired,
  onImageCapture: PropTypes.func.isRequired,
  isPortrait: PropTypes.bool.isRequired,
};

export default injectIntl(Camera);
