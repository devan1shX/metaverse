import logging
import sys
from datetime import datetime
from pathlib import Path


class ColoredFormatter(logging.Formatter):
    """Custom formatter with color coding for different log levels"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record):
        # Add color to the log level
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = (
                f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
            )
        
        # Add color to filename and function name
        filename_color = '\033[94m'  # Blue
        function_color = '\033[95m'  # Magenta
        reset = self.COLORS['RESET']
        
        if hasattr(record, 'filename') and record.filename:
            record.filename = f"{filename_color}[{record.filename}]{reset}"
        
        if hasattr(record, 'funcName') and record.funcName:
            record.funcName = f"{function_color}[{record.funcName}]{reset}"
        
        # Add color to the message based on level
        if hasattr(record, 'msg'):
            original_levelname = logging.getLevelName(record.levelno)
            color = self.COLORS.get(original_levelname, '')
            record.msg = f"{color}{record.msg}{reset}"
        
        return super().format(record)


def setup_logger(
    name: str = __name__,
    log_level: int = logging.DEBUG,
    log_file: str = None,
    console_output: bool = True,
    include_filename: bool = True,
    include_function: bool = True
) -> logging.Logger:
    """
    Setup and configure a color-coded logger
    
    Args:
        name: Logger name (usually __name__ of the module)
        log_level: Minimum logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional). If provided, logs will be saved to file
        console_output: Whether to output logs to console (default: True)
        include_filename: Whether to include filename in log format (default: True)
        include_function: Whether to include function name in log format (default: True)
    
    Returns:
        Configured logger instance
    """
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()
    
    # Format for logs - include filename and function if requested
    log_format_parts = ['%(asctime)s', '%(levelname)s', '%(name)s']
    
    if include_filename and include_function:
        log_format_parts.append('%(filename)s%(funcName)s')
    elif include_filename:
        log_format_parts.append('%(filename)s')
    elif include_function:
        log_format_parts.append('%(funcName)s')
    
    log_format_parts.append('%(message)s')
    log_format = ' | '.join(log_format_parts)
    
    date_format = '%Y-%m-%d %H:%M:%S'
    
    # Console handler with colors
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_formatter = ColoredFormatter(log_format, datefmt=date_format)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    
    # File handler (without colors, plain text)
    if log_file:
        # Create logs directory if it doesn't exist
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, mode='a', encoding='utf-8')
        file_handler.setLevel(log_level)
        file_formatter = logging.Formatter(log_format, datefmt=date_format)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger


# Example usage and testing
if __name__ == "__main__":
    # Setup logger with file output
    logger = setup_logger(
        name="MyApp",
        log_level=logging.DEBUG,
        log_file="logs/app.log",
        console_output=True,
        include_filename=True,
        include_function=True
    )
    
    # Test all log levels
    logger.debug("This is a debug message - for detailed diagnostic info")
    logger.info("This is an info message - general information")
    logger.warning("This is a warning message - something unexpected happened")
    logger.error("This is an error message - something failed")
    logger.critical("This is a critical message - serious problem!")
    
    # Examples with variables
    user = "Alice"
    logger.info(f"User {user} logged in successfully")
    
    try:
        result = 10 / 0
    except Exception as e:
        logger.error(f"Division error occurred: {e}")
    
    # With extra context
    logger.warning("Database connection slow", extra={'response_time': 5.2})

# Global logger instance for the WS Layer
logger = setup_logger(
    name="Metaverse [WS Layer]",
    log_level=logging.DEBUG,
    log_file="app.log",
    console_output=True,
    include_filename=True,
    include_function=True
)