"""
RasiSOC-Agent Windows Service Wrapper
Allows RasiSOC-Agent to run as an official Windows Service in the background
without keeping a terminal window open.
"""

import sys
import os
import servicemanager
import win32serviceutil
import win32service
import win32event

from rasi_agent import RasiSOCAgent

class RasiSOCAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "RasiSOCAgent"
    _svc_display_name_ = "Rasi NovaTech SOC Endpoint Monitor"
    _svc_description_ = "Continuous real-time asset telemetry and authorized network discovery service for Rasi NovaTech SOC."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.agent = None

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        if self.agent:
            self.agent.is_running = False

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, "")
        )
        self.agent = RasiSOCAgent()
        self.agent.start()

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(RasiSOCAgentService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(RasiSOCAgentService)
