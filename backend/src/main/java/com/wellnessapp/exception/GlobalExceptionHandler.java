package com.wellnessapp.exception;
import org.springframework.http.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;
@RestControllerAdvice public class GlobalExceptionHandler {
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class) ResponseEntity<?> responseStatus(org.springframework.web.server.ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("status", ex.getStatusCode().value(), "message", ex.getReason() == null ? "Request failed" : ex.getReason()));
    }
    @ExceptionHandler(NotFoundException.class) ResponseEntity<?> notFound(NotFoundException ex) { return error(HttpStatus.NOT_FOUND, ex.getMessage()); }
    @ExceptionHandler(BadRequestException.class) ResponseEntity<?> badRequest(BadRequestException ex) { return error(HttpStatus.BAD_REQUEST, ex.getMessage()); }
    @ExceptionHandler(ConflictException.class) ResponseEntity<?> conflict(ConflictException ex) { return error(HttpStatus.CONFLICT, ex.getMessage()); }
    @ExceptionHandler(BadCredentialsException.class) ResponseEntity<?> credentials() { return error(HttpStatus.UNAUTHORIZED, "Invalid email or password"); }
    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class) ResponseEntity<?> disabled() { return error(HttpStatus.FORBIDDEN, "Your account is awaiting admin approval or has been suspended. Please contact your admin."); }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class) ResponseEntity<?> duplicate() { return error(HttpStatus.CONFLICT, "This record already exists or conflicts with another update. Refresh and try again."); }
    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class, org.springframework.web.multipart.support.MissingServletRequestPartException.class}) ResponseEntity<?> malformed() { return error(HttpStatus.BAD_REQUEST, "Invalid or missing request data"); }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class) ResponseEntity<?> tooLarge() { return error(HttpStatus.PAYLOAD_TOO_LARGE, "Images must be 10 MB or smaller"); }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException ex) { String message = ex.getBindingResult().getFieldErrors().stream().findFirst().map(error -> error.getField() + ": " + error.getDefaultMessage()).orElse("Validation failed"); return error(HttpStatus.BAD_REQUEST, message); }
    private ResponseEntity<?> error(HttpStatus status, String message) { return ResponseEntity.status(status).body(Map.of("timestamp", Instant.now().toString(), "status", status.value(), "message", message)); }
}

