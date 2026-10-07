package com.wellnessapp.service;

import com.wellnessapp.entity.PushDevice;
import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.security.Security;
import java.util.Map;

/** Browser Web Push only. The existing Expo transport and its configuration are untouched. */
@Component
public class WebPushClient {
    private final ObjectMapper json;
    private final boolean enabled;
    private final String publicKey, privateKey, subject;
    private Transport service;
    private HttpClient http;
    private synchronized HttpClient http() {
        if (http == null) http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER).build();
        return http;
    }
    public WebPushClient(ObjectMapper json, @Value("${app.web-push.enabled:false}") boolean enabled,
            @Value("${app.web-push.public-key:}") String publicKey, @Value("${app.web-push.private-key:}") String privateKey,
            @Value("${app.web-push.subject:}") String subject) {
        this.json = json; this.enabled = enabled; this.publicKey = publicKey; this.privateKey = privateKey; this.subject = subject;
    }
    public boolean available() { return enabled && !publicKey.isBlank() && !privateKey.isBlank()
            && (subject.startsWith("mailto:") || subject.startsWith("https://")); }
    public String publicKey() { return available() ? publicKey : ""; }
    private synchronized Transport service() throws Exception {
        if (!available()) throw new IllegalStateException("Web push is not configured");
        if (service == null) {
            if (Security.getProvider("BC") == null) Security.addProvider(new BouncyCastleProvider());
            service = new Transport(publicKey, privateKey, subject);
        }
        return service;
    }
    private static class Transport extends PushService {
        Transport(String publicKey, String privateKey, String subject) throws java.security.GeneralSecurityException {
            super(publicKey, privateKey, subject);
        }
        nl.martijndwars.webpush.HttpRequest encrypt(Notification notification) throws Exception {
            return super.prepareRequest(notification, Encoding.AES128GCM);
        }
    }
    public int send(PushDevice device, Map<String, Object> payload, int ttl) throws Exception {
        // Validate again at delivery, including rows restored from older database backups.
        WebPushAccountService.validateEndpoint(device.getWebEndpoint());
        var transport = service();
        var notification = new Notification(device.getWebEndpoint(), device.getWebP256dh(), device.getWebAuth(),
                json.writeValueAsBytes(payload), ttl);
        // Initialize BC before Notification decodes the subscriber's EC public key.
        var encrypted = transport.encrypt(notification);
        var builder = HttpRequest.newBuilder(URI.create(encrypted.getUrl())).timeout(Duration.ofSeconds(10));
        encrypted.getHeaders().forEach(builder::header);
        var result = http().send(builder.POST(HttpRequest.BodyPublishers.ofByteArray(encrypted.getBody())).build(),
                HttpResponse.BodyHandlers.discarding());
        return result.statusCode();
    }
}
