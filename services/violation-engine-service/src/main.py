"""
Violation Engine Service - Main Entry Point

Entry point for the violation engine service.
Delegates to processor.main() for actual processing logic.
"""
from processor import main

if __name__ == '__main__':
    main()

