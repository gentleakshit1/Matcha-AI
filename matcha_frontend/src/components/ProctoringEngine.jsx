import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ProctoringEngine({ videoRef, onWarning, isRunning }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const requestRef = useRef();
  
  // Model refs
  const faceModelRef = useRef(null);
  const objectModelRef = useRef(null);
  
  // Tracking state
  const lastLookedAwayTime = useRef(null);
  const lookAwayTimeout = 5000; // 5 seconds tolerance
  
  useEffect(() => {
    const loadModels = async () => {
      try {
        await tf.ready();
        const faceModel = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          { runtime: 'tfjs' }
        );
        const objectModel = await cocoSsd.load();
        
        faceModelRef.current = faceModel;
        objectModelRef.current = objectModel;
        setModelsLoaded(true);
        console.log("Proctoring Models Loaded!");
      } catch (e) {
        console.error("Failed to load proctoring models", e);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!isRunning || !modelsLoaded || !videoRef.current) return;
    
    let isDetecting = false;

    const detect = async () => {
      if (isDetecting || !videoRef.current || videoRef.current.readyState < 2) {
        requestRef.current = requestAnimationFrame(detect);
        return;
      }
      
      isDetecting = true;
      try {
        const video = videoRef.current;
        
        // 1. Detect Phone (Object Detection)
        const predictions = await objectModelRef.current.detect(video);
        const hasPhone = predictions.some(p => p.class === 'cell phone' && p.score > 0.6);
        if (hasPhone) {
          onWarning("Cell phone detected in frame. Please put your devices away.");
        }

        // 2. Detect Gaze/Head Pose (Face Mesh)
        const faces = await faceModelRef.current.estimateFaces(video);
        if (faces.length === 0) {
          // No face detected
          if (!lastLookedAwayTime.current) lastLookedAwayTime.current = Date.now();
          if (Date.now() - lastLookedAwayTime.current > lookAwayTimeout) {
            onWarning("No face detected. Please stay in front of the camera.");
            lastLookedAwayTime.current = Date.now(); // reset to prevent spam
          }
        } else {
          // Face detected, check head pose (simplified heuristic based on nose position relative to face bounding box)
          const face = faces[0];
          const nose = face.keypoints.find(k => k.name === 'noseTip');
          const leftEye = face.keypoints.find(k => k.name === 'leftEye');
          const rightEye = face.keypoints.find(k => k.name === 'rightEye');
          
          if (nose && leftEye && rightEye) {
            // Very simple heuristic for looking away: if nose is too far left or right relative to eyes
            const eyeDistance = Math.abs(rightEye.x - leftEye.x);
            const noseFromLeft = Math.abs(nose.x - leftEye.x);
            const ratio = noseFromLeft / eyeDistance;
            
            // If ratio is extremely skewed (< 0.1 or > 0.9), they are turning their head sharply
            if (ratio < 0.1 || ratio > 0.9) {
              if (!lastLookedAwayTime.current) lastLookedAwayTime.current = Date.now();
              if (Date.now() - lastLookedAwayTime.current > lookAwayTimeout) {
                onWarning("Please keep your eyes on the screen.");
                lastLookedAwayTime.current = Date.now();
              }
            } else {
              // Reset if looking forward
              lastLookedAwayTime.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Proctoring detection error:", err);
      } finally {
        isDetecting = false;
        requestRef.current = requestAnimationFrame(detect);
      }
    };

    requestRef.current = requestAnimationFrame(detect);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, modelsLoaded, videoRef, onWarning]);

  return null; // This is a logic-only component, it renders nothing
}
