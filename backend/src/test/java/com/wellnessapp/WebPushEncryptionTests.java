package com.wellnessapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.PushDevice;
import com.wellnessapp.service.WebPushClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.*;
import java.security.*;
import java.security.interfaces.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebPushEncryptionTests {
    private static byte[] coordinate(java.math.BigInteger value) {
        byte[] raw = value.toByteArray(), result = new byte[32];
        System.arraycopy(raw, Math.max(0, raw.length - 32), result, Math.max(0, 32 - raw.length), Math.min(32, raw.length));
        return result;
    }
    private static String publicKey(KeyPair pair) {
        var point = ((ECPublicKey) pair.getPublic()).getW();
        byte[] encoded = new byte[65]; encoded[0] = 4;
        System.arraycopy(coordinate(point.getAffineX()), 0, encoded, 1, 32);
        System.arraycopy(coordinate(point.getAffineY()), 0, encoded, 33, 32);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(encoded);
    }
    @Test @SuppressWarnings("unchecked")
    void browserPayloadIsEncryptedAndSignedBeforeTransport() throws Exception {
        var generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        var vapid = generator.generateKeyPair();
        var client = new WebPushClient(new ObjectMapper(), true, publicKey(vapid),
                Base64.getUrlEncoder().withoutPadding().encodeToString(coordinate(((ECPrivateKey) vapid.getPrivate()).getS())), "mailto:care@example.com");
        var device = new PushDevice();
        device.setWebEndpoint("https://web.push.apple.com/test");
        device.setWebP256dh(publicKey(generator.generateKeyPair()));
        device.setWebAuth(Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[16]));
        var http = mock(HttpClient.class);
        HttpResponse<Void> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(201);
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        ReflectionTestUtils.setField(client, "http", http);
        assertEquals(201, client.send(device, Map.of("body", "private-example-message"), 120));
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertEquals("aes128gcm", request.getValue().headers().firstValue("Content-Encoding").orElseThrow());
        assertTrue(request.getValue().headers().firstValue("Authorization").orElseThrow().startsWith("vapid "));
        assertEquals("120", request.getValue().headers().firstValue("TTL").orElseThrow());
        var body = new java.io.ByteArrayOutputStream();
        request.getValue().bodyPublisher().orElseThrow().subscribe(new java.util.concurrent.Flow.Subscriber<java.nio.ByteBuffer>() {
            public void onSubscribe(java.util.concurrent.Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            public void onNext(java.nio.ByteBuffer buffer) { byte[] bytes = new byte[buffer.remaining()]; buffer.get(bytes); body.writeBytes(bytes); }
            public void onError(Throwable error) { fail(error); }
            public void onComplete() { }
        });
        assertTrue(body.size() > 32);
        assertFalse(body.toString(StandardCharsets.UTF_8).contains("private-example-message"));
    }
}
