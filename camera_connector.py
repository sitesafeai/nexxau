import cv2
import requests
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class CameraConnector(ABC):
    @abstractmethod
    def connect(self) -> bool:
        pass

    @abstractmethod
    def get_frame(self) -> Optional[np.ndarray]:
        pass

    @abstractmethod
    def disconnect(self) -> None:
        pass

class RTSPCamera(CameraConnector):
    def __init__(self, rtsp_url: str, username: str = None, password: str = None):
        self.rtsp_url = rtsp_url
        self.username = username
        self.password = password
        self.cap = None

    def connect(self) -> bool:
        try:
            if self.username and self.password:
                # Format: rtsp://username:password@ip:port/stream
                auth_url = f"rtsp://{self.username}:{self.password}@{self.rtsp_url.split('://')[1]}"
                self.cap = cv2.VideoCapture(auth_url)
            else:
                self.cap = cv2.VideoCapture(self.rtsp_url)
            return self.cap.isOpened()
        except Exception as e:
            print(f"Error connecting to RTSP camera: {e}")
            return False

    def get_frame(self) -> Optional[np.ndarray]:
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

    def disconnect(self) -> None:
        if self.cap:
            self.cap.release()

class ONVIFCamera(CameraConnector):
    def __init__(self, ip: str, port: int, username: str, password: str):
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.cap = None

    def connect(self) -> bool:
        try:
            # ONVIF cameras typically use RTSP for streaming
            rtsp_url = f"rtsp://{self.username}:{self.password}@{self.ip}:{self.port}/stream"
            self.cap = cv2.VideoCapture(rtsp_url)
            return self.cap.isOpened()
        except Exception as e:
            print(f"Error connecting to ONVIF camera: {e}")
            return False

    def get_frame(self) -> Optional[np.ndarray]:
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

    def disconnect(self) -> None:
        if self.cap:
            self.cap.release()

class CloudCamera(CameraConnector):
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        })

    def connect(self) -> bool:
        try:
            # Test connection by making a simple API call
            response = self.session.get(f"{self.api_url}/status")
            return response.status_code == 200
        except Exception as e:
            print(f"Error connecting to cloud camera: {e}")
            return False

    def get_frame(self) -> Optional[np.ndarray]:
        try:
            # Get frame from cloud API
            response = self.session.get(f"{self.api_url}/frame")
            if response.status_code == 200:
                # Convert response to image
                nparr = np.frombuffer(response.content, np.uint8)
                return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error getting frame from cloud camera: {e}")
        return None

    def disconnect(self) -> None:
        self.session.close()

# Factory to create appropriate camera connector
def create_camera_connector(camera_type: str, config: Dict[str, Any]) -> CameraConnector:
    if camera_type.lower() == 'rtsp':
        return RTSPCamera(**config)
    elif camera_type.lower() == 'onvif':
        return ONVIFCamera(**config)
    elif camera_type.lower() == 'cloud':
        return CloudCamera(**config)
    else:
        raise ValueError(f"Unsupported camera type: {camera_type}")

# Example usage:
if __name__ == "__main__":
    # Example configuration
    camera_config = {
        'rtsp_url': 'rtsp://192.168.1.100:554/stream',
        'username': 'admin',
        'password': 'password'
    }
    
    # Create camera connector
    camera = create_camera_connector('rtsp', camera_config)
    
    # Connect to camera
    if camera.connect():
        try:
            while True:
                frame = camera.get_frame()
                if frame is not None:
                    # Process frame with your YOLO model here
                    cv2.imshow('Camera Feed', frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
        finally:
            camera.disconnect()
            cv2.destroyAllWindows() 