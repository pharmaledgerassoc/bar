const double_check = require("../../../modules/double-check");
const assert = double_check.assert;
const Archive = require("../lib/Archive");
const ArchiveConfigurator = require("../lib/ArchiveConfigurator");
const createFileBrickStorage = require("../lib/FileBrickStorage").createFileBrickStorage;
const createFsAdapter = require("../lib/FsAdapter").createFsAdapter;
ArchiveConfigurator.prototype.registerStorageProvider("FileBrickStorage", createFileBrickStorage);
ArchiveConfigurator.prototype.registerFsAdapter("FsAdapter", createFsAdapter);

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

double_check.createTestFolder("bar_test_folder", (err, testFolder) => {

    const filePath = path.join(testFolder, "big.file");

    if (!fs.existsSync(filePath)) {
        const file = fs.createWriteStream(filePath);
        for (let i = 0; i <= 1e6; i++) {
            file.write('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n');
        }

        file.end();
    }

    let savePath = path.join(testFolder, "dot");

    const archiveConfigurator = new ArchiveConfigurator();
    archiveConfigurator.setStorageProvider("FileBrickStorage", savePath);
    archiveConfigurator.setFsAdapter("FsAdapter");
    archiveConfigurator.setBufferSize(1000000);
    archiveConfigurator.setEncryptionAlgorithm("aes-256-gcm");
    archiveConfigurator.setCompressionAlgorithm("gzip");
    archiveConfigurator.setMapEncryptionKey(crypto.randomBytes(32));

    const archive = new Archive(archiveConfigurator);

    assert.callback("AddExtractBigFileTest", (callback) => {
        double_check.computeFileHash(filePath, (err, initialHashes) => {
            assert.true(err === null || typeof err === "undefined", "Received error");

            archive.addFile(filePath, (err) => {
                assert.true(err === null || typeof err === "undefined", "Failed to archive file.");

                fs.unlink(filePath, (err) => {
                    assert.true(err === null || typeof err === "undefined", "Failed to delete file");

                    archive.extractFile(filePath, (err) => {
                        assert.true(err === null || typeof err === "undefined", "Failed to extract file.");

                        double_check.computeFileHash(filePath, (err, decompressedHashes) => {
                            assert.true(err === null || typeof err === "undefined", "Failed to compute folders hashes");
                            assert.true(initialHashes === decompressedHashes, "Files are not identical");
                            fs.unlink(savePath, (err) => {
                                assert.true(err === null || typeof err === "undefined", "Failed to delete file " + savePath);
                                fs.unlink(filePath, (err) => {
                                    assert.true(err === null || typeof err === "undefined", "Failed to delete file");
                                    callback();
                                });
                            });
                        });
                    });
                });
            });
        });
    }, 10000);
});

