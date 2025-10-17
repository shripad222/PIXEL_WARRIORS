import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaTimes, FaCamera, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './QRScanner.css';

const QRScanner = ({ onScan, onClose, scanType = 'entry' }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera for mobile devices
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        } else {
          setError('No cameras found on this device');
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setError('Unable to access camera. Please grant camera permissions.');
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCamera && !scanning) {
      startScanning();
    }
  }, [selectedCamera]);

  const startScanning = async () => {
    try {
      if (!selectedCamera) {
        setError('No camera selected');
        return;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        selectedCamera,
        config,
        (decodedText) => {
          // Successfully scanned
          console.log('QR Code scanned:', decodedText);
          
          try {
            const qrData = JSON.parse(decodedText);
            
            // Stop scanning
            scanner.stop().then(() => {
              setScanning(false);
              onScan(qrData, scanType);
            }).catch(console.error);
            
          } catch (err) {
            console.error('Invalid QR code format:', err);
            setError('Invalid QR code. Please scan a valid parking QR code.');
            setTimeout(() => setError(null), 3000);
          }
        },
        (errorMessage) => {
          // Scanning error (most are just "no QR code found" - ignore these)
          // Only log unexpected errors
          if (!errorMessage.includes('NotFoundException')) {
            console.warn('QR Scan error:', errorMessage);
          }
        }
      );

      setScanning(true);
      setError(null);

    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions and try again.');
    }
  };

  const handleCameraChange = (cameraId) => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setSelectedCamera(cameraId);
        setScanning(false);
      }).catch(console.error);
    } else {
      setSelectedCamera(cameraId);
    }
  };

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <div>
            <h2>
              <FaCamera style={{ marginRight: '10px' }} />
              Scan {scanType === 'entry' ? 'Entry' : 'Exit'} QR Code
            </h2>
            <p className="scan-instruction">
              Position the QR code within the frame
            </p>
          </div>
          <button className="close-scanner-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="scanner-error">
            <FaExclamationTriangle style={{ marginRight: '8px' }} />
            {error}
          </div>
        )}

        <div className="qr-scanner-body">
          {cameras.length > 1 && (
            <div className="camera-selector">
              <label>Select Camera:</label>
              <select 
                value={selectedCamera || ''} 
                onChange={(e) => handleCameraChange(e.target.value)}
                disabled={scanning}
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div id="qr-reader" className="qr-reader-container"></div>

          {scanning && (
            <div className="scanning-indicator">
              <div className="scan-line"></div>
              <p>Scanning for QR code...</p>
            </div>
          )}
        </div>

        <div className="qr-scanner-footer">
          <div className="scan-tips">
            <FaCheckCircle style={{ color: '#10b981', marginRight: '6px' }} />
            <span>Hold steady and ensure good lighting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
