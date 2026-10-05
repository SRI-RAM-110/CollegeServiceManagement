package com.nec.collegeservices.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pdf")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PdfController {

    @Autowired
    private RequestController requestController;

    @GetMapping("/accommodation/{id}")
    public ResponseEntity<byte[]> getAccommodationPdf(@PathVariable String id) {
        return requestController.getRequestPdf(id);
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getPdf(@PathVariable String id) {
        return requestController.getRequestPdf(id);
    }
}
